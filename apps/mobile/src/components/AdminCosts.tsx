import { useState } from "react";
import { trpc } from "@/lib/api";
import { Button } from "./Button";
import { Card } from "./Card";
import { Text } from "./Text";

const usd = (micros: number) => `${(micros / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 6 })} USD`;

export function AdminCosts() {
  const [open, setOpen] = useState(false);
  const report = trpc.admin.aiCosts.useQuery(undefined, { enabled: open, retry: false });
  const budget = report.data?.claudeBudget;
  return <Card>
    <Button variant="ghost" label={open ? "Masquer le suivi Claude" : "Administration · Suivi Claude"} onPress={() => setOpen(!open)} />
    {open && (report.isError ? <Text>Rapport indisponible sur ce serveur.</Text> : !budget ? <Text>Chargement du rapport…</Text> : <>
      <Text variant="heading">Budget engagé : {usd(budget.committedMicros)}</Text>
      <Text>Mois UTC : {report.data!.from.slice(0, 7)} · Tous comptes confondus</Text>
      <Text>Réservations initiales : {usd(budget.reservedMicros)} pour {budget.entries} appels.</Text>
      <Text>Coût ajusté estimé : {usd(budget.settledMicros)}.</Text>
      <Text>Encore réservé : {usd(budget.pendingMicros)} ({budget.openEntries} appels en cours ou au coût incertain).</Text>
      <Text>Plafond mensuel par compte : {budget.capPerAccountMicros === null ? "désactivé" : usd(budget.capPerAccountMicros)}.</Text>
      <Text variant="heading">Coût moyen par compte actif</Text>
      {report.data!.byPlan.map(p => <Text key={p.plan}>
        {p.plan === "free" ? "Gratuit" : p.plan === "plus" ? "Plume+" : "Plume++"} : {p.accounts} compte(s), {p.entries} appels,{" "}
        {p.averagePerAccountMicros === null ? (p.accounts ? `coût incomplet (${p.unknownEntries} appels non chiffrés)` : "aucun usage") : `${usd(p.averagePerAccountMicros)} par compte`}
        {p.priceCents ? ` · prix affiché ${(p.priceCents / 100).toLocaleString("fr-FR")} €/mois` : ""}
      </Text>)}
      <Text variant="caption">Répartition selon la formule actuelle du compte. Montants en USD estimés, prix en euros affichés : aucune marge n’est calculée tant que le change, la TVA et les frais Stripe ne sont pas rapprochés.</Text>
      <Text variant="caption">Le suivi des réservations commence à l’activation du plafond. Le budget engagé additionne les coûts ajustés et les réservations encore ouvertes ; ce montant est une estimation.</Text>
    </>)}
    {open && <Button variant="ghost" label="Actualiser" disabled={report.isFetching} onPress={() => void report.refetch()} />}
  </Card>;
}
