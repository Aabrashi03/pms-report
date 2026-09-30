const destinations=new Set(['/','/staff','/cycles','/reports','/team','/reset-password']);
export function safeAuthDestination(value:string|null|undefined):string {
  return value&&destinations.has(value)?value:'/';
}
