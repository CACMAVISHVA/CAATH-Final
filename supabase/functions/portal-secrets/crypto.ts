const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const decode = (s: string) => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
const keyFrom = async (raw: string) => {
 const bytes = decode(raw.trim());
 if (bytes.length !== 32) throw new Error('Invalid vault key');
 return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt','decrypt']);
};
export type VaultContext = { id: string; firm_id: string; client_id: string; field: 'username'|'password' };
const aad = (context: VaultContext) => new TextEncoder().encode(JSON.stringify([context.firm_id,context.client_id,context.id,context.field]));
export async function encryptSecret(value: string, rawKey: string, version: string, context: VaultContext) {
 if (!/^[a-zA-Z0-9_-]{1,32}$/.test(version)) throw new Error('Invalid key version');
 const iv = crypto.getRandomValues(new Uint8Array(12));
 const cipher = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(context)},await keyFrom(rawKey),new TextEncoder().encode(value)));
 return JSON.stringify({v:1,k:version,iv:encode(iv),cipher:encode(cipher)});
}
export async function decryptSecret(payload: string, keys: Record<string,string>, activeVersion: string, context: VaultContext) {
 if (payload.startsWith('{')) {
  const p = JSON.parse(payload);
  if(p.v!==1 || typeof p.k!=='string' || !keys[p.k]) throw new Error('Unknown vault key version');
  const bytes = await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(p.iv),additionalData:aad(context)},await keyFrom(keys[p.k]),decode(p.cipher));
  return new TextDecoder().decode(bytes);
 }
 // Legacy format remains readable with the original master key only.
 const bytes = decode(payload);
 const result = await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},await keyFrom(keys.legacy || keys[activeVersion]),bytes.slice(12));
 return new TextDecoder().decode(result);
}
