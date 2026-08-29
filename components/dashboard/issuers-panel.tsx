"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input, Field } from "../ui/field";
import { Badge } from "../ui/badge";
import { OrgLogo } from "../org-logo";

export type Issuer = { address: string; orgName: string };

export function IssuersPanel({
  issuers,
  onAdd,
  onRemove,
  busy,
}: {
  issuers: Issuer[];
  onAdd: (address: string, orgName: string) => Promise<string | null>;
  onRemove: (address: string) => Promise<string | null>;
  busy: boolean;
}) {
  const [address, setAddress] = useState("");
  const [orgName, setOrgName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (!address.trim() || !orgName.trim()) return;
    const err = await onAdd(address.trim(), orgName.trim());
    setMsg(err ?? `Registered ${orgName.trim()} as an issuer`);
    if (!err) {
      setAddress("");
      setOrgName("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-5 py-3.5 font-medium">Organization</th>
              <th className="px-5 py-3.5 font-medium">Issuer address</th>
              <th className="px-5 py-3.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {issuers.map((i) => (
              <motion.tr
                key={i.address}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-line/50 last:border-0"
              >
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-2.5">
                    <OrgLogo name={i.orgName} size={26} rounded="rounded-lg" />
                    <Badge tone="primary">{i.orgName}</Badge>
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-muted">{i.address}</td>
                <td className="px-5 py-3.5 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      const err = await onRemove(i.address);
                      setMsg(err ?? `Revoked ${i.orgName}`);
                    }}
                  >
                    Revoke
                  </Button>
                </td>
              </motion.tr>
            ))}
            {issuers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-sm text-muted">
                  No issuers registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="glass rounded-2xl p-5">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Register a new issuer
        </p>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Org name">
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="FIEM ACM"
            />
          </Field>
          <Field label="Signing address (G…)">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value.toUpperCase())}
              placeholder="GB…"
              className="font-mono text-xs"
            />
          </Field>
          <Button onClick={submit} disabled={busy} className="h-[42px]">
            {busy ? "Working…" : "Register"}
          </Button>
        </div>
        {msg && <p className="mt-3 text-xs text-muted">{msg}</p>}
      </div>
    </div>
  );
}
