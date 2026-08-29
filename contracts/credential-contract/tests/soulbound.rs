//! Tests for the soulbound credential contract: issuer-gated mint,
//! the non-transferable invariant, holder/issuer burn, and reads.

use credential_contract::{CredentialContract, CredentialContractClient};
use issuer_registry::{IssuerRegistry, IssuerRegistryClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Env, String,
};

/// Returns (env, admin, registry, credential, authorized_org).
fn setup() -> (Env, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);

    let admin = Address::generate(&env);
    let registry = env.register(IssuerRegistry, ());
    let registry_client = IssuerRegistryClient::new(&env, &registry);
    registry_client.initialize(&admin);

    let credential = env.register(CredentialContract, ());
    CredentialContractClient::new(&env, &credential).initialize(&admin, &registry);

    let org = Address::generate(&env);
    registry_client.add_issuer(&admin, &org, &String::from_str(&env, "FIEM ACM"));

    (env, admin, registry, credential, org)
}

fn cid(env: &Env, s: &str) -> String {
    String::from_str(env, s)
}

#[test]
fn mint_by_authorized_issuer_succeeds() {
    let (env, _admin, _registry, credential, org) = setup();
    let client = CredentialContractClient::new(&env, &credential);
    let holder = Address::generate(&env);
    let metadata = cid(
        &env,
        "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    );

    let id = client.mint(&org, &holder, &metadata);

    assert_eq!(id, 1);
    let data = client.get_token(&id);
    assert_eq!(data.holder, holder);
    assert_eq!(data.issuer, org);
    assert_eq!(data.org_name, String::from_str(&env, "FIEM ACM"));
    assert_eq!(data.cid, metadata);
    assert!(data.issued_at > 0);

    let creds = client.get_credentials(&holder);
    assert_eq!(creds.len(), 1);
    assert_eq!(creds.get_unchecked(0).id, 1);
    assert_eq!(client.token_count(), 1);
}

#[test]
fn mint_by_unauthorized_address_fails() {
    let (env, _admin, _registry, credential, _org) = setup();
    let client = CredentialContractClient::new(&env, &credential);
    let stranger = Address::generate(&env);
    let holder = Address::generate(&env);

    let result = client.try_mint(
        &stranger,
        &holder,
        &cid(&env, "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3"),
    );

    assert!(result.is_err());
    assert_eq!(client.token_count(), 0);
    assert_eq!(client.get_credentials(&holder).len(), 0);
}

#[test]
fn mint_after_issuer_revocation_fails() {
    let (env, _admin, registry, credential, org) = setup();
    let registry_client = IssuerRegistryClient::new(&env, &registry);
    let client = CredentialContractClient::new(&env, &credential);
    let holder = Address::generate(&env);

    registry_client.remove_issuer(&registry_client.get_admin(), &org);

    let result = client.try_mint(
        &org,
        &holder,
        &cid(&env, "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3"),
    );

    assert!(result.is_err());
    assert_eq!(client.token_count(), 0);
}

#[test]
fn transfer_always_fails_soulbound() {
    // The core invariant: credentials can never be transferred, no matter
    // who calls or whether the token exists. This test pins that behavior.
    let (env, _admin, _registry, credential, org) = setup();
    let client = CredentialContractClient::new(&env, &credential);
    let holder = Address::generate(&env);
    let other = Address::generate(&env);

    let id = client.mint(
        &org,
        &holder,
        &cid(&env, "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3"),
    );
    let result = client.try_transfer(&holder, &other, &id);

    assert!(result.is_err());

    // Holder unchanged; the credential is still in the original holder's list.
    assert_eq!(client.get_token(&id).holder, holder);
    assert_eq!(client.get_credentials(&holder).len(), 1);
    assert_eq!(client.get_credentials(&other).len(), 0);
}

#[test]
fn burn_by_holder_self_revoke() {
    let (env, _admin, _registry, credential, org) = setup();
    let client = CredentialContractClient::new(&env, &credential);
    let holder = Address::generate(&env);

    let id = client.mint(
        &org,
        &holder,
        &cid(&env, "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3"),
    );
    client.burn(&holder, &id);

    assert!(client.try_get_token(&id).is_err());
    assert_eq!(client.get_credentials(&holder).len(), 0);
    // token_count is all-time, so it stays at 1.
    assert_eq!(client.token_count(), 1);
}

#[test]
fn burn_by_issuer_revokes() {
    let (env, _admin, _registry, credential, org) = setup();
    let client = CredentialContractClient::new(&env, &credential);
    let holder = Address::generate(&env);

    let id = client.mint(
        &org,
        &holder,
        &cid(&env, "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3"),
    );
    client.burn(&org, &id);

    assert!(client.try_get_token(&id).is_err());
    assert_eq!(client.get_credentials(&holder).len(), 0);
}

#[test]
fn burn_by_unrelated_address_fails() {
    let (env, _admin, _registry, credential, org) = setup();
    let client = CredentialContractClient::new(&env, &credential);
    let holder = Address::generate(&env);
    let stranger = Address::generate(&env);

    let id = client.mint(
        &org,
        &holder,
        &cid(&env, "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3"),
    );
    let result = client.try_burn(&stranger, &id);

    assert!(result.is_err());
    assert_eq!(client.get_credentials(&holder).len(), 1);
}

#[test]
fn get_credentials_excludes_burned_and_keeps_order() {
    let (env, _admin, _registry, credential, org) = setup();
    let client = CredentialContractClient::new(&env, &credential);
    let holder = Address::generate(&env);

    let first = client.mint(&org, &holder, &cid(&env, "cid-one"));
    let second = client.mint(&org, &holder, &cid(&env, "cid-two"));
    let third = client.mint(&org, &holder, &cid(&env, "cid-three"));

    client.burn(&holder, &second);

    let creds = client.get_credentials(&holder);
    assert_eq!(creds.len(), 2);
    assert_eq!(creds.get_unchecked(0).id, first);
    assert_eq!(creds.get_unchecked(1).id, third);
}

#[test]
fn multiple_issuers_each_track_their_credentials() {
    let (env, admin, registry, credential, org_a) = setup();
    let registry_client = IssuerRegistryClient::new(&env, &registry);
    let client = CredentialContractClient::new(&env, &credential);
    let holder = Address::generate(&env);

    let org_b = Address::generate(&env);
    registry_client.add_issuer(&admin, &org_b, &String::from_str(&env, "HackSpire"));

    let id_a = client.mint(&org_a, &holder, &cid(&env, "cid-a"));
    let id_b = client.mint(&org_b, &holder, &cid(&env, "cid-b"));

    assert_eq!(client.get_credentials(&holder).len(), 2);
    assert_eq!(
        client.get_token(&id_a).org_name,
        String::from_str(&env, "FIEM ACM")
    );
    assert_eq!(
        client.get_token(&id_b).org_name,
        String::from_str(&env, "HackSpire")
    );
}

#[test]
fn set_registry_is_admin_gated() {
    let (env, admin, _registry, credential, _org) = setup();
    let client = CredentialContractClient::new(&env, &credential);
    let evil = Address::generate(&env);
    let new_registry = Address::generate(&env);

    assert!(client.try_set_registry(&evil, &new_registry).is_err());
    client.set_registry(&admin, &new_registry);
}
