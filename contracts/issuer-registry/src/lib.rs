//! Issuer registry — role-based registry mapping Stellar addresses to
//! community organizations (e.g. "FIEM ACM", "GDG Groups", "HackSpire")
//! with admin-controlled add/remove.
//!
//! Exposes `is_authorized_issuer(address) -> bool`, which the
//! credential-contract calls to gate minting. Only trust-relevant logic lives
//! here: authorization state and admin-gated mutation.

#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, String, Symbol, Vec};

const ADMIN_KEY: Symbol = symbol_short!("admin");
const ISSUERS_KEY: Symbol = symbol_short!("issuers");

type IssuerMap = soroban_sdk::Map<Address, String>;

#[contract]
pub struct IssuerRegistry;

#[contractimpl]
impl IssuerRegistry {
    /// One-time setup. `admin` becomes the only address that may add or
    /// remove issuers.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage()
            .instance()
            .set(&ISSUERS_KEY, &IssuerMap::new(&env));
    }

    /// Admin-gated: register `issuer` as the signing address of `org_name`.
    /// `admin` must be the address set in `initialize` and must authorize
    /// the call.
    pub fn add_issuer(env: Env, admin: Address, issuer: Address, org_name: String) {
        Self::require_admin(&env, &admin);
        let mut issuers = Self::load(&env);
        issuers.set(issuer, org_name);
        env.storage().instance().set(&ISSUERS_KEY, &issuers);
    }

    /// Admin-gated: revoke an issuer. Credentials it already minted remain
    /// valid; it can no longer mint new ones.
    pub fn remove_issuer(env: Env, admin: Address, issuer: Address) {
        Self::require_admin(&env, &admin);
        let mut issuers = Self::load(&env);
        if !issuers.contains_key(issuer.clone()) {
            panic!("issuer not found");
        }
        issuers.remove(issuer);
        env.storage().instance().set(&ISSUERS_KEY, &issuers);
    }

    /// Public read — called by the credential contract to gate `mint`, and by
    /// the dashboard. No auth required: this reveals no sensitive state.
    pub fn is_authorized_issuer(env: Env, issuer: Address) -> bool {
        Self::load(&env).contains_key(issuer)
    }

    /// Public read: organization display name for an issuer, if registered.
    pub fn org_name(env: Env, issuer: Address) -> Option<String> {
        Self::load(&env).get(issuer)
    }

    /// Public read: all registered issuers with their org names.
    pub fn get_issuers(env: Env) -> Vec<(Address, String)> {
        let issuers = Self::load(&env);
        let mut out = Vec::new(&env);
        for (address, org_name) in issuers.iter() {
            out.push_back((address, org_name));
        }
        out
    }

    /// Public read: the admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("not initialized")
    }

    fn require_admin(env: &Env, admin: &Address) {
        let stored: Address = env
            .storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("not initialized");
        if *admin != stored {
            panic!("not admin");
        }
        admin.require_auth();
    }

    fn load(env: &Env) -> IssuerMap {
        env.storage()
            .instance()
            .get(&ISSUERS_KEY)
            .expect("not initialized")
    }
}
