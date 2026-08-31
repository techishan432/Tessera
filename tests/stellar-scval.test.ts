import { describe, it, expect } from "vitest";
import {
  scvVec,
  scvString,
  scvU32,
  scvU64,
  scvBool,
  scvOption,
  scvSymbolText,
  scvCredential,
  scvIssuerPair,
} from "../lib/stellar/scval";
import { Keypair, xdr } from "@stellar/stellar-sdk";

describe("Stellar ScVal Decoders", () => {
  it("decodes scvU32 and scvU64 values correctly", () => {
    const u32Val = xdr.ScVal.scvU32(42);
    expect(scvU32(u32Val)).toBe(42);

    const u64Val = xdr.ScVal.scvU64(xdr.Uint64.fromString("1700000000"));
    expect(scvU64(u64Val)).toBe(1700000000);
  });

  it("decodes scvString and scvSymbol correctly", () => {
    const strVal = xdr.ScVal.scvString("HackSpire 2026");
    expect(scvString(strVal)).toBe("HackSpire 2026");

    const symVal = xdr.ScVal.scvSymbol("org_name");
    expect(scvSymbolText(symVal)).toBe("org_name");
  });

  it("decodes scvBool correctly", () => {
    expect(scvBool(xdr.ScVal.scvBool(true))).toBe(true);
    expect(scvBool(xdr.ScVal.scvBool(false))).toBe(false);
  });

  it("handles scvOption correctly for Some and None", () => {
    const someVal = xdr.ScVal.scvVec([xdr.ScVal.scvU32(100)]);
    expect(scvOption(someVal, scvU32)).toBe(100);

    const noneVal = xdr.ScVal.scvVec([]);
    expect(scvOption(noneVal, scvU32)).toBeNull();
  });

  it("decodes CredentialOnChain map structure correctly", () => {
    const holderKp = Keypair.random();
    const issuerKp = Keypair.random();

    const credentialMap = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("id"),
        val: xdr.ScVal.scvU32(7),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("holder"),
        val: xdr.ScVal.scvAddress(
          xdr.ScAddress.scAddressTypeAccount(
            xdr.AccountId.publicKeyTypeEd25519(holderKp.rawPublicKey())
          )
        ),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("issuer"),
        val: xdr.ScVal.scvAddress(
          xdr.ScAddress.scAddressTypeAccount(
            xdr.AccountId.publicKeyTypeEd25519(issuerKp.rawPublicKey())
          )
        ),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("org_name"),
        val: xdr.ScVal.scvString("FIEM ACM"),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("cid"),
        val: xdr.ScVal.scvString("bafybeicredential123456"),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("issued_at"),
        val: xdr.ScVal.scvU64(xdr.Uint64.fromString("1725000000")),
      }),
    ]);

    const decoded = scvCredential(credentialMap);
    expect(decoded.id).toBe(7);
    expect(decoded.holder).toBe(holderKp.publicKey());
    expect(decoded.issuer).toBe(issuerKp.publicKey());
    expect(decoded.orgName).toBe("FIEM ACM");
    expect(decoded.cid).toBe("bafybeicredential123456");
    expect(decoded.issuedAt).toBe(1725000000);
  });

  it("decodes scvIssuerPair correctly", () => {
    const issuerKp = Keypair.random();
    const pairVec = xdr.ScVal.scvVec([
      xdr.ScVal.scvAddress(
        xdr.ScAddress.scAddressTypeAccount(
          xdr.AccountId.publicKeyTypeEd25519(issuerKp.rawPublicKey())
        )
      ),
      xdr.ScVal.scvString("GDG Groups"),
    ]);

    const decoded = scvIssuerPair(pairVec);
    expect(decoded.address).toBe(issuerKp.publicKey());
    expect(decoded.orgName).toBe("GDG Groups");
  });
});
