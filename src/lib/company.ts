import "server-only";

// Hvem står bag AssensNu. Sættes på Vercel, så det står rigtigt i privatlivspolitik og handelsbetingelser.
export function company() {
  const get = (k: string) => process.env[k]?.trim() || null;
  return { name: get("FIRMA_NAVN"), cvr: get("FIRMA_CVR"), address: get("FIRMA_ADRESSE"), email: get("FIRMA_MAIL") };
}

export const companyComplete = () => Object.values(company()).every(Boolean);
