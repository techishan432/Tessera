//! Tests for the issuer registry: adding/removing issuers, authorization
//! checks, and admin gating.

use issuer_registry::{IssuerRegistry, IssuerRegistryClient};
use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation, Events as _},
    xdr::{ContractEventBody, ScMap, ScMapEntry, ScVal},
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

/// The V0 body of a contract event (topics + data).
fn v0(event: &soroban_sdk::xdr::ContractEvent) -> &soroban_sdk::xdr::ContractEventV0 {
    match &event.body {
        ContractEventBody::V0(v0) => v0,
    }
}

/// Build the expected event data: a map of the event's non-topic fields.
fn data_map(env: &Env, entries: &[(&str, ScVal)]) -> ScVal {
    let sc_entries: Vec<ScMapEntry> = entries
        .iter()
        .map(|(k, v)| ScMapEntry {
            key: ScVal::from(Symbol::new(env, k)),
            val: v.clone(),
        })
        .collect();
    ScVal::Map(Some(ScMap(sc_entries.try_into().unwrap())))
}

#[test]
fn add_issuer_emits_event() {
    let (env, admin, registry) = deploy();
    let client = IssuerRegistryClient::new(&env, &registry);
    let issuer = Address::generate(&env);
    let org = String::from_str(&env, "GDG Groups");

    client.add_issuer(&admin, &issuer, &org);

    let all = env.events().all().filter_by_contract(&registry);
    let events = all.events();
    assert_eq!(events.len(), 1);
    let v0 = v0(events.first().unwrap());
    assert_eq!(v0.topics.len(), 2);
    let expected_name = ScVal::from(Symbol::new(&env, "add_issuer"));
    assert_eq!(v0.topics.first().unwrap(), &expected_name);
    let expected_issuer = ScVal::from(issuer);
    assert_eq!(v0.topics.get(1).unwrap(), &expected_issuer);
    let expected_org = ScVal::String("GDG Groups".as_bytes().to_vec().try_into().unwrap());
    assert_eq!(v0.data, data_map(&env, &[("org_name", expected_org)]));
}

#[test]
fn remove_issuer_emits_event() {
    let (env, admin, registry) = deploy();
    let client = IssuerRegistryClient::new(&env, &registry);
    let issuer = Address::generate(&env);

    client.add_issuer(&admin, &issuer, &String::from_str(&env, "FIEM ACM"));
    client.remove_issuer(&admin, &issuer);

    // The test host keeps events per top-level call, so pick the
    // remove_issuer event by its name topic rather than by index.
    let all = env.events().all().filter_by_contract(&registry);
    let remove_events: Vec<_> = all
        .events()
        .iter()
        .filter(|e| {
            let b = v0(e);
            b.topics.first() == Some(&ScVal::from(Symbol::new(&env, "remove_issuer")))
        })
        .collect();
    assert_eq!(remove_events.len(), 1);
    let v0 = v0(remove_events.first().unwrap());
    assert_eq!(v0.topics.len(), 2);
    let expected_name = ScVal::from(Symbol::new(&env, "remove_issuer"));
    assert_eq!(v0.topics.first().unwrap(), &expected_name);
    let expected_issuer = ScVal::from(issuer);
    assert_eq!(v0.topics.get(1).unwrap(), &expected_issuer);
    // Data carries who performed the revocation.
    let expected_admin = ScVal::from(admin);
    assert_eq!(v0.data, data_map(&env, &[("admin", expected_admin)]));
}
