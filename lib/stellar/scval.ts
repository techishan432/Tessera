import { StrKey, xdr } from "@stellar/stellar-sdk";

/**
 * Decoders for the ScVal shapes our two contracts return. Each ScVal variant
 * carries a `type` discriminator and a `.value` (this SDK's xdr generation).
 * Soroban encodes contract structs as an ScvVec in field-declaration order
 * (field names come from the contract spec).
 */

type ScVal = xdr.ScVal;

export function scvVec(v: ScVal): ScVal[] {
  if (v.type !== "scvVec") throw new Error(`ScVal: expected ScvVec, got ${v.type}`);
  return v.value ?? [];
}

export function scvAddress(v: ScVal): string {
  if (v.type !== "scvAddress") throw new Error(`ScVal: expected ScvAddress, got ${v.type}`);
  const inner = v.value;
  if (inner.type === "scAddressTypeAccount") {
    return StrKey.encodeEd25519PublicKey(inner.accountId.ed25519.value);
  }
  throw new Error(`ScVal: unsupported address kind ${inner.type}`);
}

export function scvString(v: ScVal): string {
  if (v.type !== "scvString") throw new Error(`ScVal: expected ScvString, got ${v.type}`);
  return v.value;
}

export function scvU32(v: ScVal): number {
  if (v.type !== "scvU32") throw new Error(`ScVal: expected ScvU32, got ${v.type}`);
  return v.value;
}

export function scvU64(v: ScVal): number {
  if (v.type !== "scvU64") throw new Error(`ScVal: expected ScvU64, got ${v.type}`);
  return Number(v.value);
}

export function scvBool(v: ScVal): boolean {
  if (v.type !== "scvBool") throw new Error(`ScVal: expected ScvBool, got ${v.type}`);
  return v.value;
}

/** Option<T> on the wire: scvVec [inner] or scvVec []. */
export function scvOption<T>(v: ScVal, inner: (x: ScVal) => T): T | null {
  const innerVec = scvVec(v);
  if (innerVec.length === 0) return null;
  return inner(innerVec[0]);
}

export interface CredentialOnChain {
  id: number;
  holder: string;
  issuer: string;
  orgName: string;
  cid: string;
  issuedAt: number;
}

export function scvSymbolText(v: ScVal): string {
  if (v.type !== "scvSymbol") throw new Error(`ScVal: expected ScvSymbol, got ${v.type}`);
  return v.sym.toString();
}

/**
 * CredentialData. In this protocol generation structs encode as an ScvMap
 * keyed by field-name symbols; the legacy field-order ScvVec is kept as a
 * fallback.
 */
export function scvCredential(v: ScVal): CredentialOnChain {
  if (v.type === "scvMap") {
    const f: Record<string, ScVal> = {};
    for (const entry of v.map ?? []) {
      f[scvSymbolText(entry.key)] = entry.val;
    }
    return {
      id: scvU32(f.id),
      holder: scvAddress(f.holder),
      issuer: scvAddress(f.issuer),
      orgName: scvString(f.org_name),
      cid: scvString(f.cid),
      issuedAt: scvU64(f.issued_at),
    };
  }
  const fields = scvVec(v);
  if (fields.length !== 6) throw new Error(`unexpected CredentialData arity: ${fields.length}`);
  return {
    id: scvU32(fields[0]),
    holder: scvAddress(fields[1]),
    issuer: scvAddress(fields[2]),
    orgName: scvString(fields[3]),
    cid: scvString(fields[4]),
    issuedAt: scvU64(fields[5]),
  };
}

/** (Address, String) tuple, as returned by registry get_issuers. */
export function scvIssuerPair(v: ScVal): { address: string; orgName: string } {
  const f = scvVec(v);
  if (f.length !== 2) throw new Error(`unexpected issuer tuple arity: ${f.length}`);
  return { address: scvAddress(f[0]), orgName: scvString(f[1]) };
}
