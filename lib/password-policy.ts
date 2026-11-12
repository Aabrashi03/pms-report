export const PASSWORD_REQUIREMENTS=[
  {id:'length',label:'Minimum 8 characters',test:(password:string)=>password.length>=8},
  {id:'uppercase',label:'At least 1 uppercase letter',test:(password:string)=>/[A-Z]/.test(password)},
  {id:'lowercase',label:'At least 1 lowercase letter',test:(password:string)=>/[a-z]/.test(password)},
  {id:'number',label:'At least 1 number',test:(password:string)=>/[0-9]/.test(password)},
  {id:'special',label:'At least 1 special character (e.g. ! @ # $ %)',test:(password:string)=>/[^A-Za-z0-9\s]/.test(password)},
] as const;

export function passwordRequirementResults(password:string){
  return PASSWORD_REQUIREMENTS.map(rule=>({id:rule.id,label:rule.label,met:rule.test(password)}));
}

export function passwordPolicyError(password:string){
  const missing=passwordRequirementResults(password).filter(rule=>!rule.met);
  return missing.length?`Password requirements not met: ${missing.map(rule=>rule.label.toLowerCase()).join('; ')}.`:'';
}
