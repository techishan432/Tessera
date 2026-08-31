//! Soulbound credential contract.
//!
//! Each credential is minted to a specific Stellar address and can never be
//! transferred — `transfer` reverts unconditionally. `burn` is the only exit:
//! self-revocation by the holder, or revocation by the original issuing org.
//! Minting is gated on the issuer-registry contract's authorization check.
//!
//! Only trust-relevant logic lives here: authorization, non-transferability,
//! and holder/issuer revocation. Business data (claim text, evidence,
//! verification) lives off-chain; on-chain we store just the metadata CID.

#![no_std]

use soroban_sdk::{
    contract, contractclient, contractevent, contractimpl, contracttype, symbol_short, Address,
    Env, String, Symbol, Vec,
};

const ADMIN_KEY: Symbol = symbol_short!("admin");
const REGISTRY_KEY: Symbol = symbol_short!("registry");
const COUNTER_KEY: Symbol = symbol_short!("counter");
const TOKEN_KEY: Symbol = symbol_short!("tok");
const INDEX_KEY: Symbol = symbol_short!("idx");
const ISSUER_IDX_KEY: Symbol = symbol_short!("iidx");

/// The subset of the issuer-registry interface this contract calls.
/// `#[contractclient]` generates `RegistryClient` for cross-contract calls.
#[contractclient(name = "RegistryClient")]
pub trait IssuerRegistryInterface {
    fn is_authorized_issuer(issuer: Address) -> bool;
    fn org_name(issuer: Address) -> Option<String>;
}

/// A credential as stored on-chain. The full badge metadata (type,
/// description, event, date, evidence, AI verification citation) lives in the
/// IPFS document addressed by `cid`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CredentialData {
    pub id: u32,
    pub holder: Address,
    pub issuer: Address,
    pub org_name: String,
    pub cid: String,
    pub issued_at: u64,
}

fn token_key(id: u32) -> (Symbol, u32) {
    (TOKEN_KEY, id)
}

fn index_key(holder: &Address) -> (Symbol, Address) {
    (INDEX_KEY, holder.clone())
}

/// Emitted on every mint. Topics: `["mint", issuer, to]`, data: token id.
#[contractevent(topics = ["mint"])]
pub struct MintEvent {
    #[topic]
    pub issuer: Address,
    #[topic]
    pub to: Address,
    pub id: u32,
}

/// Emitted on every burn. Topics: `["burn", token_id]`, data: who authorized.
#[contractevent(topics = ["burn"])]
pub struct BurnEvent {
    #[topic]
    pub token_id: u32,
    pub authorized_by: Address,
}

#[contract]
pub struct CredentialContract;

#[contractimpl]
impl CredentialContract {
    /// One-time setup. `registry` is the issuer-registry contract that gates
    /// minting; `admin` may re-point it (e.g. after a registry upgrade).
    pub fn initialize(env: Env, admin: Address, registry: Address) {
        if env.storage().instance().has(&REGISTRY_KEY) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&REGISTRY_KEY, &registry);
        env.storage().instance().set(&COUNTER_KEY, &0u32);
    }

    /// Admin-gated: re-point to a redeployed issuer-registry. `admin` must be
    /// the address set in `initialize` and must authorize the call.
    pub fn set_registry(env: Env, admin: Address, registry: Address) {
        let stored: Address = env
            .storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("not initialized");
        if admin != stored {
            panic!("not admin");
        }
        admin.require_auth();
        env.storage().instance().set(&REGISTRY_KEY, &registry);
    }

    /// Mint a credential for `to`. `issuer` must be a Stellar address the
    /// registry confirms is an authorized org, and must authorize the call
    /// (i.e. the org's key signs the transaction).
    ///
    /// Returns the new credential's id.
    pub fn mint(env: Env, issuer: Address, to: Address, metadata_cid: String) -> u32 {
        issuer.require_auth();

        let registry_addr: Address = env
            .storage()
            .instance()
            .get(&REGISTRY_KEY)
            .expect("not initialized");
        let registry = RegistryClient::new(&env, &registry_addr);
        if !registry.is_authorized_issuer(&issuer) {
            panic!("caller is not an authorized issuer");
        }
        let org_name = registry
            .org_name(&issuer)
            .unwrap_or_else(|| String::from_str(&env, "Unknown"));

        let id = Self::next_id(&env);
        let data = CredentialData {
            id,
            holder: to.clone(),
            issuer: issuer.clone(),
            org_name,
            cid: metadata_cid,
            issued_at: env.ledger().timestamp(),
        };
        env.storage().instance().set(&token_key(id), &data);

        let idx_key = index_key(&to);
        let mut ids: Vec<u32> = env
            .storage()
            .instance()
            .get(&idx_key)
            .unwrap_or_else(|| Vec::new(&env));
        ids.push_back(id);
        env.storage().instance().set(&idx_key, &ids);

        // Per-issuer index (org dashboards: "what has this org issued?").
        let issuer_idx_key = (ISSUER_IDX_KEY, issuer.clone());
        let mut issued: Vec<u32> = env
            .storage()
            .instance()
            .get(&issuer_idx_key)
            .unwrap_or_else(|| Vec::new(&env));
        issued.push_back(id);
        env.storage().instance().set(&issuer_idx_key, &issued);

        // Observability: visible in Stellar Expert, consumable by listeners.
        MintEvent {
            issuer: issuer.clone(),
            to: to.clone(),
            id,
        }
        .publish(&env);

        id
    }

    /// SOULBOUND: this contract intentionally has no working transfer.
    /// Any call reverts. This is the invariant that makes credentials
    /// non-transferable; it is pinned by a dedicated test.
    pub fn transfer(_env: Env, _from: Address, _to: Address, _id: u32) -> u32 {
        panic!("credentials are soulbound: transfer is permanently disabled")
    }

    /// Burn (revoke) a credential. Callable by the holder (self-revoke) or by
    /// the original issuing org (revocation) — `authorized_by` must be one of
    /// the two and must authorize the call.
    pub fn burn(env: Env, authorized_by: Address, token_id: u32) {
        authorized_by.require_auth();

        let key = token_key(token_id);
        let token: CredentialData = env
            .storage()
            .instance()
            .get(&key)
            .expect("credential not found");

        let is_holder = authorized_by == token.holder;
        let is_issuer = authorized_by == token.issuer;
        if !is_holder && !is_issuer {
            panic!("only the holder or the issuing org can burn");
        }

        env.storage().instance().remove(&key);

        let idx_key = index_key(&token.holder);
        let mut ids: Vec<u32> = env
            .storage()
            .instance()
            .get(&idx_key)
            .unwrap_or_else(|| Vec::new(&env));
        if let Some(pos) = ids.first_index_of(token_id) {
            ids.remove(pos);
        }
        env.storage().instance().set(&idx_key, &ids);

        // Per-issuer index: forget the burned credential.
        let issuer_idx_key = (ISSUER_IDX_KEY, token.issuer.clone());
        let mut issued: Vec<u32> = env
            .storage()
            .instance()
            .get(&issuer_idx_key)
            .unwrap_or_else(|| Vec::new(&env));
        if let Some(pos) = issued.first_index_of(token_id) {
            issued.remove(pos);
        }
        env.storage().instance().set(&issuer_idx_key, &issued);

        // Observability: topics carry the token id, data who authorized.
        BurnEvent {
            token_id,
            authorized_by: authorized_by.clone(),
        }
        .publish(&env);
    }

    /// All live (non-burned) credentials for `holder`, oldest first.
    /// Read-only; powers the public profile page.
    pub fn get_credentials(env: Env, holder: Address) -> Vec<CredentialData> {
        let ids: Vec<u32> = env
            .storage()
            .instance()
            .get(&index_key(&holder))
            .unwrap_or_else(|| Vec::new(&env));
        let mut out = Vec::new(&env);
        for id in ids.iter() {
            if let Some(token) = env.storage().instance().get(&token_key(id)) {
                out.push_back(token);
            }
        }
        out
    }

    /// Single credential by id.
    pub fn get_token(env: Env, token_id: u32) -> CredentialData {
        env.storage()
            .instance()
            .get(&token_key(token_id))
            .expect("credential not found")
    }

    /// Public read: number of credentials minted so far (all time, including
    /// burned). Powers the landing-page stat.
    pub fn token_count(env: Env) -> u32 {
        env.storage().instance().get(&COUNTER_KEY).unwrap_or(0)
    }

    /// Public read: live (non-burned) credentials minted by `issuer`, oldest
    /// first. Powers org dashboards ("what has this org issued?").
    pub fn get_issuer_credential_ids(env: Env, issuer: Address) -> Vec<u32> {
        let ids: Vec<u32> = env
            .storage()
            .instance()
            .get(&(ISSUER_IDX_KEY, issuer))
            .unwrap_or_else(|| Vec::new(&env));
        let mut out = Vec::new(&env);
        for id in ids.iter() {
            if env.storage().instance().has(&token_key(id)) {
                out.push_back(id);
            }
        }
        out
    }

    fn next_id(env: &Env) -> u32 {
        let counter: u32 = env.storage().instance().get(&COUNTER_KEY).unwrap_or(0);
        let next = counter + 1;
        env.storage().instance().set(&COUNTER_KEY, &next);
        next
    }
}
