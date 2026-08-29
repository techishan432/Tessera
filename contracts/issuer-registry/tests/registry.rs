//! Tests for the issuer registry: adding/removing issuers, authorization
//! checks, and admin gating.

use issuer_registry::{IssuerRegistry, IssuerRegistryClient};
use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation},
    Address, Env, IntoVal, String, Symbol,
};

/// Returns (env, admin, registry_address) with a deployed, initialized
/// registry and all auths mocked (happy-path setup).
fn deploy() -> (Env, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let registry = env.register(IssuerRegistry, ());
    IssuerRegistryClient::new(&env, &registry).initialize(&admin);
    (env, admin, registry)
}

#[test]
fn add_issuer_registers_org_name() {
    let (env, admin, registry) = deploy();
    let client = IssuerRegistryClient::new(&env, &registry);
    let issuer = Address::generate(&env);
    let org = String::from_str(&env, "FIEM ACM");

    client.add_issuer(&admin, &issuer, &org);

    // Verify the auth the contract actually required: the admin signed for
    // this exact call (mocked, but recorded). Must be read immediately —
    // env.auths() reflects the most recent invocation only.
    let args = (&admin, &issuer, org.clone()).into_val(&env);
    assert_eq!(
        env.auths(),
        [(
            admin,
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    registry,
                    Symbol::new(&env, "add_issuer"),
                    args,
                )),
                sub_invocations: [].into(),
            }
        )]
    );

    assert!(client.is_authorized_issuer(&issuer));
    assert_eq!(client.org_name(&issuer), Some(org));
    let all = client.get_issuers();
    assert_eq!(all.len(), 1);
}

#[test]
fn remove_issuer_revokes_authorization() {
    let (env, admin, registry) = deploy();
    let client = IssuerRegistryClient::new(&env, &registry);
    let issuer = Address::generate(&env);
    client.add_issuer(&admin, &issuer, &String::from_str(&env, "GDG Groups"));

    client.remove_issuer(&admin, &issuer);

    assert!(!client.is_authorized_issuer(&issuer));
    assert_eq!(client.org_name(&issuer), None);
}

#[test]
fn remove_unknown_issuer_fails() {
    let (env, admin, registry) = deploy();
    let client = IssuerRegistryClient::new(&env, &registry);
    let ghost = Address::generate(&env);

    let result = client.try_remove_issuer(&admin, &ghost);

    assert!(result.is_err());
}

#[test]
fn unregistered_address_is_not_authorized() {
    let (env, _admin, registry) = deploy();
    let client = IssuerRegistryClient::new(&env, &registry);
    let stranger = Address::generate(&env);

    assert!(!client.is_authorized_issuer(&stranger));
}

#[test]
fn only_admin_can_add_issuer() {
    let (env, _admin, registry) = deploy();
    let client = IssuerRegistryClient::new(&env, &registry);
    let evil = Address::generate(&env);
    let issuer = Address::generate(&env);

    let result = client.try_add_issuer(&evil, &issuer, &String::from_str(&env, "Evil Corp"));

    assert!(result.is_err());
}

#[test]
fn only_admin_can_remove_issuer() {
    let (env, _admin, registry) = deploy();
    let client = IssuerRegistryClient::new(&env, &registry);
    let evil = Address::generate(&env);
    let issuer = Address::generate(&env);

    let result = client.try_remove_issuer(&evil, &issuer);

    assert!(result.is_err());
}
