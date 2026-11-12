export function restrictPdrChanges(current:Record<string,unknown>,incoming:Record<string,unknown>,role:"employee"|"manager"|"hod"|"viewer"){
  if(role==="viewer") return current;
  const object=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
  const basePart=object(current.particulars),nextPart=object(incoming.particulars),baseSign=object(current.signatures),nextSign=object(incoming.signatures);
  const dateKeys=["pdrDate","kpiFrom","kpiTo"];
  const particulars={...basePart,...Object.fromEntries(dateKeys.map(key=>[key,nextPart[key]??basePart[key]]))};
  if(role==="hod") return {...current,particulars,signatures:{...baseSign,hodDate:nextSign.hodDate??baseSign.hodDate}};
  const mergeRatings=(baseValue:unknown,nextValue:unknown)=>{
    const base=Array.isArray(baseValue)?baseValue:[],next=Array.isArray(nextValue)?nextValue:[];
    return Array.from({length:Math.max(base.length,next.length)},(_,index)=>{const oldRow=object(base[index]),newRow=object(next[index]);return role==="employee"?{...oldRow,employee:newRow.employee??oldRow.employee??"",manager:oldRow.manager??"",comments:newRow.comments??oldRow.comments??""}:{...oldRow,employee:oldRow.employee??"",manager:newRow.manager??oldRow.manager??"",comments:newRow.comments??oldRow.comments??""};});
  };
  return {...current,particulars,sectionA:mergeRatings(current.sectionA,incoming.sectionA),sectionB:mergeRatings(current.sectionB,incoming.sectionB),reflection:incoming.reflection??current.reflection,nextKpis:incoming.nextKpis??current.nextKpis,training:incoming.training??current.training,signatures:{...baseSign,[role==="employee"?"employeeDate":"managerDate"]:nextSign[role==="employee"?"employeeDate":"managerDate"]??baseSign[role==="employee"?"employeeDate":"managerDate"]}};
}
