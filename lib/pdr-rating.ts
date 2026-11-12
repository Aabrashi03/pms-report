export type RatingColumn = "employee" | "manager";
export type RatingInput = { employee?: string; manager?: string };
export type KpiRatingInput = { kra?: string; kpi?: string; action?: string; rating?: string };

export type RatingSummary = {
  points: number;
  completed: number;
  applicable: number;
  maximum: number;
  average: number | null;
  complete: boolean;
};

export function calculateRating(rows:RatingInput[],column:RatingColumn,applicable=rows.length):RatingSummary{
  const applicableRows=rows.slice(0,applicable);
  const scores=applicableRows.flatMap(row=>{
    const raw=row[column];
    if(raw==null||raw.trim()==="")return[];
    const score=Number(raw);
    return Number.isFinite(score)&&score>=0&&score<=5?[score]:[];
  });
  const points=scores.reduce((sum,score)=>sum+score,0);
  return {points,completed:scores.length,applicable,maximum:applicable*5,average:scores.length?points/scores.length:null,complete:scores.length===applicable};
}

export function combineRatings(...summaries:RatingSummary[]):RatingSummary{
  const points=summaries.reduce((sum,item)=>sum+item.points,0);
  const completed=summaries.reduce((sum,item)=>sum+item.completed,0);
  const applicable=summaries.reduce((sum,item)=>sum+item.applicable,0);
  const maximum=summaries.reduce((sum,item)=>sum+item.maximum,0);
  return {points,completed,applicable,maximum,average:completed?points/completed:null,complete:summaries.every(item=>item.complete)};
}

export function calculateKpiRating(rows:KpiRatingInput[]):RatingSummary{
  const completedRows=rows.filter(row=>row.kra?.trim()&&row.kpi?.trim()&&row.action?.trim());
  const scores=completedRows.flatMap(row=>{
    const raw=row.rating;
    if(raw==null||raw.trim()==="")return[];
    const score=Number(raw);
    return Number.isFinite(score)&&score>=0&&score<=5?[score]:[];
  });
  const points=scores.reduce((sum,score)=>sum+score,0);
  const applicable=completedRows.length;
  const complete=applicable>0&&scores.length===applicable;
  return {points,completed:scores.length,applicable,maximum:applicable*5,average:complete?points/applicable:null,complete};
}

export function displayRating(value:number|null){
  return value==null?"—":value.toFixed(2).replace(/\.00$/,"").replace(/(\.\d)0$/,"$1");
}
