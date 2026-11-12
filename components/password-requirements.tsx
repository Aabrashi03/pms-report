import { passwordRequirementResults } from '@/lib/password-policy';

export function PasswordRequirements({password}:{password:string}){
  return <section className="password-requirements" aria-label="Password requirements"><strong>Password requirements</strong><ul>{passwordRequirementResults(password).map(rule=><li className={rule.met?'is-met':''} key={rule.id}><span aria-hidden>{rule.met?'✓':'•'}</span>{rule.label}</li>)}</ul></section>;
}
