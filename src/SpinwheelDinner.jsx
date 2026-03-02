import { useState, useEffect, useRef } from "react";

const COUNTRIES = [
  { label: "Japan", flag: "🇯🇵", value: "Japan" },
  { label: "China", flag: "🇨🇳", value: "China" },
  { label: "Korea", flag: "🇰🇷", value: "Korea" },
  { label: "Thailand", flag: "🇹🇭", value: "Thailand" },
  { label: "Vietnam", flag: "🇻🇳", value: "Vietnam" },
  { label: "Philippines", flag: "🇵🇭", value: "Philippines" },
  { label: "Indonesia", flag: "🇮🇩", value: "Indonesia" },
  { label: "Malaysia", flag: "🇲🇾", value: "Malaysia" },
  { label: "PNG", flag: "🇵🇬", value: "Papua New Guinea" },
  { label: "Australia", flag: "🇦🇺", value: "Australia" },
  { label: "Sweden", flag: "🇸🇪", value: "Sweden" },
  { label: "France", flag: "🇫🇷", value: "France" },
  { label: "Italy", flag: "🇮🇹", value: "Italy" },
  { label: "Spain", flag: "🇪🇸", value: "Spain" },
  { label: "Greece", flag: "🇬🇷", value: "Greece" },
  { label: "Germany", flag: "🇩🇪", value: "Germany" },
  { label: "Turkey", flag: "🇹🇷", value: "Turkey" },
  { label: "Mexico", flag: "🇲🇽", value: "Mexico" },
  { label: "Peru", flag: "🇵🇪", value: "Peru" },
  { label: "USA", flag: "🇺🇸", value: "USA" },
  { label: "Surprise!", flag: "🌍", value: "OTHER" },
];

const DEFAULT_SETTINGS = {
  person1Name: "Tommy",
  person1Health: "Mild kidney concerns (slightly elevated creatinine, low eGFR) — avoid high-protein excess, limit phosphorus/potassium-heavy foods. Formerly mild gastritis — avoid very spicy/acidic/fried too often, but occasionally fine.",
  person1Goals: "Lose a few kilos, protect kidney and gut health.",
  person2Name: "Wife",
  person2Health: "Lactose sensitive — small amounts of cream/butter occasionally fine, not every day. Allergic to crustaceans (shrimp, lobster, crab) — husband can eat them.",
  person2Goals: "Lose ~10kg.",
  foodPhilosophy: "Focus on TRADITIONAL, ROBUST, HOME-STYLE food — the kind of dish a grandmother would make. Think Swedish husmanskost, French cuisine du terroir, Japanese okasan no ryori, Italian cucina povera. NOT fancy restaurant food, NOT fusion. Simple, hearty, honest food made with few ingredients that people have eaten for generations.",
  baseIngredients: ["White fish", "Minced meat", "Chicken", "Eggs", "Leafy greens", "Squid", "Clams", "Tofu"],
};

function loadSettings() {
  try {
    const raw = localStorage.getItem("pandaDinner_settings");
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}
function saveSettings(s) {
  try { localStorage.setItem("pandaDinner_settings", JSON.stringify(s)); } catch {}
}

function buildSystemPrompt(settings, country, includedIngredients) {
  const cuisineInstruction = country === "OTHER"
    ? "Pick a cuisine from ANY country NOT in this list: Japan, China, Korea, Thailand, Vietnam, Philippines, Indonesia, Malaysia, Papua New Guinea, Australia, Sweden, France, Italy, Spain, Greece, Germany, Turkey, Mexico, Peru, USA. Be adventurous."
    : `The cuisine MUST be from ${country}. Suggest a genuinely traditional, everyday home-style dish from ${country}.`;
  const ingredientLine = includedIngredients.length > 0
    ? `\nTonight, please make sure to include: ${includedIngredients.join(", ")}.` : "";
  return `You are a personal dinner recommendation assistant for a couple living in Tokyo.

## ${settings.person1Name}
Health: ${settings.person1Health}
Goals: ${settings.person1Goals}

## ${settings.person2Name}
Health: ${settings.person2Health}
Goals: ${settings.person2Goals}

## Both
Avoid sugar, processed foods, refined carbs. Keto-friendly preferred but not strict. Live in Tokyo. Budget-conscious. Base ingredients they like: ${settings.baseIngredients.join(", ")}.

## Food Philosophy
${settings.foodPhilosophy}

## Recipe Rules
4–7 core ingredients max. Pantry-friendly. Split into mandatory and optional. Max 4 cooking steps, casual plain language.

## Cuisine
${cuisineInstruction}
${ingredientLine}

## Output — JSON only, no markdown, no code fences:
{
  "dishName": "string",
  "cuisineOrigin": "string",
  "shortHistory": "string — 2-3 warm human sentences",
  "youtubeSearchQuery": "string",
  "mandatoryIngredients": [{"name":"string","dot":"green|yellow|red","healthNote":"1-2 sentences on fat type, vitamins, kidney/weight relevance"}],
  "optionalIngredients": [{"name":"string","dot":"green|yellow|red","healthNote":"string"}],
  "steps": ["max 4 casual steps"],
  "macros": {"protein": number, "fat": number, "carbs": number},
  "healthRating": "integer 1-5"
}

Dot: green=great for goals, yellow=fine in moderation, red=occasional treat.
Macros: % estimates summing to 100.
Current date: ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} Tokyo.`;
}

const C = {
  bg: "#fffef5", bgAlt: "#fdf9e8", bgCard: "#fffcee",
  border: "#e8d870", borderLight: "#f0e8a0",
  amber: "#c8860a", amberLight: "#f5e090", amberDark: "#8a5c00",
  green: "#4a8030", greenBg: "#f2faed", greenBorder: "#9ac870",
  text: "#3a2e10", textMid: "#6a5828", textLight: "#9a8860", textFaint: "#b8a878",
  red: "#b04040", dotGreen: "#3a9040", dotYellow: "#c8900a", dotRed: "#c03838",
  macroProtein: "#5a8de0", macroFat: "#e8a020", macroCarbs: "#60b060",
};

// ─── Spinning Wheel ───────────────────────────────────────────────────────────
function SpinWheel({ onSpinComplete, disabled }) {
  const canvasRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const animRef = useRef(null);
  const angleRef = useRef(0);

  const numSegments = COUNTRIES.length;
  const segAngle = (2 * Math.PI) / numSegments;

  const colors = [
    "#fff8e0","#fef0c0","#fde8a0","#fce080","#fbd860",
    "#fef4d0","#fde8b0","#fce090","#fbce70","#fac850",
    "#fff0c8","#fee8a8","#fde088","#fcd868","#fbd048",
    "#fef8e8","#fdf0c8","#fce8a8","#fbe088","#fad868","#f9d048",
  ];

  function drawWheel(angle) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const r = Math.min(cx, cy) - 4;

    ctx.clearRect(0, 0, W, H);

    // Draw segments
    for (let i = 0; i < numSegments; i++) {
      const start = angle + i * segAngle;
      const end = start + segAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = "#e8c840";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + segAngle / 2);
      ctx.textAlign = "right";

      // Flag
      ctx.font = "16px serif";
      ctx.fillText(COUNTRIES[i].flag, r - 8, 5);

      // Label
      ctx.font = "bold 9px system-ui";
      ctx.fillStyle = "#5a3800";
      ctx.fillText(COUNTRIES[i].label, r - 30, 5);

      ctx.restore();
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = "#c8a020";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center circle
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 44);
    grad.addColorStop(0, "#fff8e0");
    grad.addColorStop(1, "#fde8a0");
    ctx.beginPath();
    ctx.arc(cx, cy, 44, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#c8a020";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  useEffect(() => {
    drawWheel(angleRef.current);
  }, []);

  function spin() {
    if (spinning || disabled) return;
    setSpinning(true);

    // Pick random target country
    const targetIdx = Math.floor(Math.random() * numSegments);

    // Integer full spins (5, 6, or 7) — must be whole numbers or the landing segment will be wrong
    const totalFullSpins = 5 + Math.floor(Math.random() * 3);
    // Exact angle where targetIdx center sits under the pointer (top = -PI/2)
    const targetAngle = -Math.PI / 2 - (targetIdx * segAngle + segAngle / 2);
    // Counterclockwise delta from current position to target (always positive, in [0, 2π))
    const delta = ((angleRef.current - targetAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const finalAngle = angleRef.current - totalFullSpins * 2 * Math.PI - delta;

    const duration = 5500 + Math.random() * 1500; // 5.5-7s
    const startAngle = angleRef.current;
    const startTime = performance.now();

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    function animate(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easedT = easeOut(t);
      const angle = startAngle + (finalAngle - startAngle) * easedT;
      angleRef.current = angle;
      setCurrentAngle(angle);
      drawWheel(angle);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        onSpinComplete(COUNTRIES[targetIdx].value);
      }
    }

    animRef.current = requestAnimationFrame(animate);
  }

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
      {/* Pointer triangle at top */}
      <div style={{
        position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "10px solid transparent",
        borderRight: "10px solid transparent",
        borderTop: "20px solid #c8860a",
        zIndex: 10,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
      }} />

      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        style={{ borderRadius: "50%", boxShadow: "0 8px 32px rgba(180,130,10,0.22), 0 2px 8px rgba(0,0,0,0.1)" }}
      />

      {/* Center button */}
      <button
        onClick={spin}
        disabled={spinning || disabled}
        style={{
          position: "absolute",
          width: "78px", height: "78px",
          borderRadius: "50%",
          background: spinning
            ? "linear-gradient(135deg, #d4a830, #b87010)"
            : "linear-gradient(135deg, #f0b828, #d08010)",
          border: "3px solid #fff",
          boxShadow: "0 4px 16px rgba(180,110,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
          cursor: spinning || disabled ? "not-allowed" : "pointer",
          color: "#fff",
          fontSize: "13px",
          fontWeight: "800",
          letterSpacing: "0.05em",
          transition: "all 0.2s",
          transform: spinning ? "scale(0.95)" : "scale(1)",
        }}
      >
        {spinning ? "..." : "SPIN"}
      </button>
    </div>
  );
}

// ─── Macro pie ────────────────────────────────────────────────────────────────
function MacroPie({ protein, fat, carbs }) {
  const total = protein + fat + carbs;
  if (!total) return null;
  const p = protein/total, f = fat/total, cb = carbs/total;
  function arc(start, end, color) {
    if ((end-start) < 0.01) return null;
    const r=46,cx=60,cy=60;
    const a1=start*2*Math.PI-Math.PI/2, a2=end*2*Math.PI-Math.PI/2;
    const x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);
    const x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
    return <path key={color} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${(end-start)>0.5?1:0},1 ${x2},${y2} Z`} fill={color}/>;
  }
  return (
    <div style={{display:"flex",alignItems:"center",gap:"16px",padding:"14px 18px",background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:"14px",marginBottom:"20px"}}>
      <svg width="80" height="80" viewBox="0 0 120 120" style={{flexShrink:0}}>
        {arc(0,p,C.macroProtein)}{arc(p,p+f,C.macroFat)}{arc(p+f,1,C.macroCarbs)}
        <circle cx="60" cy="60" r="28" fill={C.bgCard}/>
      </svg>
      <div style={{flex:1}}>
        <div style={{fontSize:"10px",letterSpacing:"0.12em",textTransform:"uppercase",color:C.textMid,fontWeight:"600",marginBottom:"10px"}}>Macros (est.)</div>
        {[{label:"Protein",pct:Math.round(p*100),color:C.macroProtein},{label:"Fat",pct:Math.round(f*100),color:C.macroFat},{label:"Carbs",pct:Math.round(cb*100),color:C.macroCarbs}].map(({label,pct,color})=>(
          <div key={label} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"5px"}}>
            <span style={{width:"10px",height:"10px",borderRadius:"50%",background:color,flexShrink:0}}/>
            <span style={{fontSize:"12px",color:C.textMid,width:"54px"}}>{label}</span>
            <div style={{flex:1,height:"5px",background:"#ede8d0",borderRadius:"3px",overflow:"hidden"}}>
              <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:"3px"}}/>
            </div>
            <span style={{fontSize:"12px",color:C.textLight,width:"32px",textAlign:"right"}}>{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ingredient pill ──────────────────────────────────────────────────────────
function IngredientPill({ name, dot, healthNote, optional }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const [above, setAbove] = useState(false);
  const dotColor = dot==="green"?C.dotGreen:dot==="red"?C.dotRed:C.dotYellow;
  const dotLabel = dot==="green"?"✓":dot==="red"?"!":"~";
  return (
    <div ref={ref} onMouseEnter={()=>{if(ref.current){const r=ref.current.getBoundingClientRect();setAbove(r.bottom+130>window.innerHeight);}setHovered(true);}} onMouseLeave={()=>setHovered(false)} style={{position:"relative",display:"inline-block"}}>
      <span style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"5px 13px 5px 8px",background:optional?C.greenBg:"#fff",border:optional?`1px dashed ${C.greenBorder}`:`1px solid #d4aa50`,borderRadius:"20px",fontSize:"13px",color:optional?C.green:"#4a3808",cursor:"default",userSelect:"none"}}>
        <span style={{width:"16px",height:"16px",borderRadius:"50%",background:dotColor,color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:"800",flexShrink:0}}>{dotLabel}</span>
        {name}
      </span>
      {hovered && healthNote && (
        <div style={{position:"absolute",[above?"bottom":"top"]:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:"#2a2010",border:`1px solid ${C.amber}`,borderRadius:"10px",padding:"10px 13px",fontSize:"12px",color:"#f0e8cc",width:"220px",zIndex:200,lineHeight:1.6,boxShadow:"0 6px 24px rgba(0,0,0,0.3)",pointerEvents:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"5px"}}>
            <span style={{width:"10px",height:"10px",borderRadius:"50%",background:dotColor,flexShrink:0}}/>
            <span style={{fontWeight:"700",color:"#fff",fontSize:"11px"}}>{name}</span>
          </div>
          {healthNote}
        </div>
      )}
    </div>
  );
}

function StarRating({ rating }) {
  const r = Math.min(5,Math.max(1,Math.round(rating)));
  return (
    <div style={{display:"flex",gap:"3px",alignItems:"center"}}>
      {[1,2,3,4,5].map(i=><span key={i} style={{fontSize:"16px",color:i<=r?C.amber:"#ddd0a0"}}>★</span>)}
      <span style={{color:C.textLight,fontSize:"12px",marginLeft:"4px"}}>{r}/5</span>
    </div>
  );
}

// ─── Dish card ────────────────────────────────────────────────────────────────
function DishCard({ dish, youtubeUrl }) {
  const [visible, setVisible] = useState(false);
  useEffect(()=>{setTimeout(()=>setVisible(true),50);},[]);
  return (
    <div style={{opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(20px)",transition:"all 0.55s cubic-bezier(0.16,1,0.3,1)"}}>
      <div style={{background:`linear-gradient(135deg,${C.bgAlt},#fef5c8)`,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"20px 22px",marginBottom:"18px",boxShadow:"0 3px 16px rgba(180,140,20,0.09)"}}>
        <div style={{display:"inline-block",background:"rgba(200,134,10,0.12)",color:C.amber,padding:"3px 11px",borderRadius:"14px",fontSize:"10px",fontWeight:"700",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"10px"}}>{dish.cuisineOrigin}</div>
        <h2 style={{margin:"0 0 10px",fontFamily:"Georgia,serif",fontSize:"clamp(22px,5vw,30px)",color:C.text,lineHeight:1.2}}>{dish.dishName}</h2>
        <p style={{margin:0,color:C.textLight,fontSize:"13px",lineHeight:1.8,fontStyle:"italic"}}>{dish.shortHistory}</p>
      </div>
      <div style={{marginBottom:"14px"}}>
        <div style={{fontSize:"10px",letterSpacing:"0.14em",textTransform:"uppercase",color:C.textMid,fontWeight:"600",marginBottom:"9px",display:"flex",alignItems:"center",gap:"6px"}}>
          <span style={{width:"6px",height:"6px",borderRadius:"50%",background:C.amber,display:"inline-block"}}/>You need these
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
          {(dish.mandatoryIngredients||[]).map((ing,i)=><IngredientPill key={i} name={ing.name||ing} dot={ing.dot||"yellow"} healthNote={ing.healthNote} optional={false}/>)}
        </div>
      </div>
      {dish.optionalIngredients?.length>0&&(
        <div style={{marginBottom:"10px"}}>
          <div style={{fontSize:"10px",letterSpacing:"0.14em",textTransform:"uppercase",color:C.green,fontWeight:"600",marginBottom:"9px",display:"flex",alignItems:"center",gap:"6px"}}>
            <span style={{width:"6px",height:"6px",borderRadius:"50%",border:`1px solid ${C.green}`,display:"inline-block"}}/>Nice to add
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
            {dish.optionalIngredients.map((ing,i)=><IngredientPill key={i} name={ing.name||ing} dot={ing.dot||"green"} healthNote={ing.healthNote} optional={true}/>)}
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:"14px",marginBottom:"14px",flexWrap:"wrap"}}>
        {[{color:C.dotGreen,label:"Great for your goals"},{color:C.dotYellow,label:"Fine in moderation"},{color:C.dotRed,label:"Occasional treat"}].map(({color,label})=>(
          <div key={label} style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",color:C.textFaint}}>
            <span style={{width:"9px",height:"9px",borderRadius:"50%",background:color,flexShrink:0}}/>{label}
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"20px"}}>
        <span style={{fontSize:"10px",letterSpacing:"0.1em",textTransform:"uppercase",color:C.textLight,fontWeight:"600"}}>Health rating</span>
        <StarRating rating={dish.healthRating}/>
      </div>
      {dish.macros&&<MacroPie protein={dish.macros.protein||0} fat={dish.macros.fat||0} carbs={dish.macros.carbs||0}/>}
      <div style={{background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:"14px",padding:"16px 18px",marginBottom:"20px"}}>
        <div style={{fontSize:"10px",letterSpacing:"0.14em",textTransform:"uppercase",color:C.textMid,fontWeight:"600",marginBottom:"14px"}}>How to make it</div>
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          {(dish.steps||[]).map((step,i)=>(
            <div key={i} style={{display:"flex",gap:"12px",alignItems:"flex-start"}}>
              <span style={{flexShrink:0,width:"22px",height:"22px",borderRadius:"50%",background:"#fffae0",border:`1.5px solid ${C.amber}`,color:C.amber,fontSize:"10px",fontWeight:"700",display:"flex",alignItems:"center",justifyContent:"center"}}>{i+1}</span>
              <p style={{margin:0,color:"#5a4828",fontSize:"13.5px",lineHeight:1.75}}>{step}</p>
            </div>
          ))}
        </div>
      </div>
      {youtubeUrl&&(
        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:"7px",background:"#fff",border:`1px solid #ddb850`,borderRadius:"10px",padding:"10px 16px",color:"#7a5820",textDecoration:"none",fontSize:"13px"}}>
          <span style={{color:"#ff3333"}}>▶</span>Watch on YouTube
        </a>
      )}
    </div>
  );
}

// ─── Settings drawer ──────────────────────────────────────────────────────────
function SettingsDrawer({ open, onClose, settings, onSave }) {
  const [local, setLocal] = useState(settings);
  const [newIng, setNewIng] = useState("");
  useEffect(()=>{setLocal(settings);},[settings,open]);
  function set(k,v){setLocal(p=>({...p,[k]:v}));}
  function addIng(){const v=newIng.trim();if(v&&!local.baseIngredients.includes(v))set("baseIngredients",[...local.baseIngredients,v]);setNewIng("");}
  function removeIng(i){set("baseIngredients",local.baseIngredients.filter(x=>x!==i));}
  if(!open)return null;
  const iStyle={width:"100%",padding:"8px 12px",borderRadius:"8px",border:`1px solid ${C.border}`,background:"#fff",fontSize:"13px",color:C.text,fontFamily:"sans-serif",outline:"none",boxSizing:"border-box"};
  const tStyle={...iStyle,resize:"vertical",lineHeight:1.6};
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(50,35,0,0.22)",zIndex:50,backdropFilter:"blur(2px)"}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(420px,100vw)",background:C.bg,borderLeft:`1px solid ${C.border}`,zIndex:51,display:"flex",flexDirection:"column",boxShadow:"-8px 0 40px rgba(100,70,0,0.12)"}}>
        <div style={{padding:"18px 22px 14px",borderBottom:`1px solid ${C.borderLight}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.bgAlt}}>
          <div>
            <div style={{fontSize:"9px",letterSpacing:"0.18em",textTransform:"uppercase",color:C.amber,fontWeight:"600",marginBottom:"3px"}}>Preferences</div>
            <div style={{fontSize:"18px",color:C.text}}>Settings</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:"20px",color:C.textLight,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 22px"}}>
          {[{key:"1",name:local.person1Name||"Person 1"},{key:"2",name:local.person2Name||"Person 2"}].map(({key,name})=>(
            <div key={key} style={{marginBottom:"24px"}}>
              <div style={{fontSize:"11px",fontWeight:"700",color:C.amberDark,marginBottom:"12px",paddingBottom:"8px",borderBottom:`1px solid ${C.borderLight}`}}>👤 {name}</div>
              <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                <div><div style={{fontSize:"11px",color:C.textLight,marginBottom:"5px"}}>Name</div><input value={local[`person${key}Name`]} onChange={e=>set(`person${key}Name`,e.target.value)} style={iStyle}/></div>
                <div><div style={{fontSize:"11px",color:C.textLight,marginBottom:"5px"}}>Health conditions & notes</div><textarea value={local[`person${key}Health`]} onChange={e=>set(`person${key}Health`,e.target.value)} rows={3} style={tStyle}/></div>
                <div><div style={{fontSize:"11px",color:C.textLight,marginBottom:"5px"}}>Goals</div><textarea value={local[`person${key}Goals`]} onChange={e=>set(`person${key}Goals`,e.target.value)} rows={2} style={tStyle}/></div>
              </div>
            </div>
          ))}
          <div style={{marginBottom:"24px"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:C.amberDark,marginBottom:"12px",paddingBottom:"8px",borderBottom:`1px solid ${C.borderLight}`}}>🍳 Food Philosophy</div>
            <textarea value={local.foodPhilosophy} onChange={e=>set("foodPhilosophy",e.target.value)} rows={5} style={tStyle}/>
          </div>
          <div>
            <div style={{fontSize:"11px",fontWeight:"700",color:C.amberDark,marginBottom:"12px",paddingBottom:"8px",borderBottom:`1px solid ${C.borderLight}`}}>🛒 Base Ingredients</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"7px",marginBottom:"10px"}}>
              {local.baseIngredients.map(ing=>(
                <span key={ing} style={{display:"inline-flex",alignItems:"center",gap:"5px",padding:"4px 10px 4px 12px",background:"#fff",border:`1px solid ${C.borderLight}`,borderRadius:"16px",fontSize:"12px",color:C.textMid}}>
                  {ing}<button onClick={()=>removeIng(ing)} style={{background:"none",border:"none",cursor:"pointer",color:C.textFaint,fontSize:"13px",padding:0,lineHeight:1}}>✕</button>
                </span>
              ))}
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <input value={newIng} onChange={e=>setNewIng(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addIng()} placeholder="Add ingredient…" style={{...iStyle,flex:1}}/>
              <button onClick={addIng} style={{padding:"7px 14px",background:C.amber,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:"600"}}>Add</button>
            </div>
          </div>
        </div>
        <div style={{padding:"14px 22px",borderTop:`1px solid ${C.borderLight}`,background:C.bgAlt,display:"flex",gap:"10px"}}>
          <button onClick={onClose} style={{flex:1,padding:"11px",background:"none",border:`1px solid ${C.border}`,borderRadius:"10px",color:C.textMid,cursor:"pointer",fontSize:"14px"}}>Cancel</button>
          <button onClick={()=>{onSave(local);onClose();}} style={{flex:2,padding:"11px",background:"linear-gradient(135deg,#e8a818,#c87808)",border:"none",borderRadius:"10px",color:"#fff",cursor:"pointer",fontSize:"14px",fontWeight:"700",boxShadow:"0 3px 12px rgba(200,120,10,0.25)"}}>Save Settings</button>
        </div>
      </div>
    </>
  );
}

function IngredientCheck({ label, checked, onChange }) {
  return (
    <label style={{display:"inline-flex",alignItems:"center",gap:"7px",padding:"6px 14px",borderRadius:"20px",border:checked?`1.5px solid ${C.green}`:`1px solid #c8d8a0`,background:checked?C.greenBg:"#fafff5",cursor:"pointer",fontSize:"13px",color:checked?C.green:"#6a7850",fontWeight:checked?"600":"400",transition:"all 0.15s",userSelect:"none"}}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{display:"none"}}/>
      <span style={{width:"14px",height:"14px",borderRadius:"3px",border:checked?`2px solid ${C.green}`:"1.5px solid #a0b870",background:checked?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"9px",color:"#fff"}}>{checked?"✓":""}</span>
      {label}
    </label>
  );
}

// ─── Main app ─────────────────────────────────────────────────────────────────
export default function PandaDinnerGenerator() {
  const [settings, setSettings] = useState(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState([]);
  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState(null);
  const [history, setHistory] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [landedCountry, setLandedCountry] = useState(null);

  function handleSaveSettings(s) {
    setSettings(s); saveSettings(s);
    setCheckedIngredients(prev=>prev.filter(i=>s.baseIngredients.includes(i)));
  }
  function toggleIngredient(ing) {
    setCheckedIngredients(prev=>prev.includes(ing)?prev.filter(i=>i!==ing):[...prev,ing]);
  }

  async function handleSpinComplete(countryValue) {
    setLandedCountry(countryValue);
    setLoading(true); setError(null); setDish(null); setYoutubeUrl(null);

    const historyCtx = history.length>0?`\n\nPreviously suggested (avoid): ${history.join(", ")}.`:"";
    try {
      const res = await fetch("/api/suggest",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          max_tokens:1500,
          system:buildSystemPrompt(settings,countryValue,checkedIngredients)+historyCtx,
          messages:[{role:"user",content:"Suggest tonight's dinner. Return only a JSON object, no markdown."}],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text||"";
      let parsed;
      try { parsed=JSON.parse(text.replace(/```json|```/g,"").trim()); }
      catch { throw new Error("Couldn't parse response — try again."); }
      setDish(parsed);
      setHistory(prev=>[...prev,parsed.dishName].slice(-15));
      setYoutubeUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(parsed.youtubeSearchQuery||parsed.dishName)}`);
    } catch(err) {
      setError(err.message||"Something went wrong.");
    } finally { setLoading(false); setSpinning(false); }
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#fffef5 0%,#fef9e2 60%,#f8f2d5 100%)",fontFamily:"system-ui,sans-serif",color:C.text}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"14px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"rgba(255,254,245,0.97)",backdropFilter:"blur(8px)",zIndex:10,boxShadow:"0 1px 10px rgba(180,140,20,0.07)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
          <span style={{fontSize:"24px"}}>🐼</span>
          <h1 style={{margin:0,fontSize:"clamp(15px,3vw,20px)",fontWeight:400,color:"#3a2800"}}>Panda Dinner Generator</h1>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          {history.length>0&&(
            <div style={{textAlign:"right",fontSize:"10px",lineHeight:1.55,marginRight:"4px"}}>
              <div style={{color:C.textFaint}}>Recently:</div>
              {history.slice(-2).map((h,i)=><div key={i} style={{color:"#d0b870"}}>{h}</div>)}
            </div>
          )}
          <button onClick={()=>setSettingsOpen(true)} style={{background:"#fff8e0",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"8px 12px",cursor:"pointer",fontSize:"17px"}}>⚙️</button>
        </div>
      </div>

      <div style={{maxWidth:"560px",margin:"0 auto",padding:"26px 20px 60px"}}>

        {/* Ingredient checkboxes */}
        {settings.baseIngredients.length>0&&(
          <div style={{marginBottom:"28px"}}>
            <div style={{fontSize:"10px",letterSpacing:"0.14em",textTransform:"uppercase",color:C.textMid,fontWeight:"600",marginBottom:"9px"}}>
              Include tonight <span style={{color:C.textFaint,textTransform:"none",letterSpacing:0,fontWeight:"400",fontSize:"11px"}}>— tick what you want to use</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
              {settings.baseIngredients.map(ing=><IngredientCheck key={ing} label={ing} checked={checkedIngredients.includes(ing)} onChange={()=>toggleIngredient(ing)}/>)}
            </div>
          </div>
        )}

        {/* Spin wheel */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:"32px"}}>
          <div style={{fontSize:"10px",letterSpacing:"0.14em",textTransform:"uppercase",color:C.textMid,fontWeight:"600",marginBottom:"16px"}}>
            Spin for tonight's cuisine
          </div>
          <SpinWheel onSpinComplete={handleSpinComplete} disabled={loading} />
          {landedCountry && !loading && (
            <div style={{marginTop:"14px",fontSize:"12px",color:C.textLight,animation:"fadeUp 0.4s ease"}}>
              {COUNTRIES.find(c=>c.value===landedCountry)?.flag} Landed on <strong style={{color:C.amberDark}}>{landedCountry === "OTHER" ? "Surprise destination!" : landedCountry}</strong> — spin again anytime
            </div>
          )}
        </div>

        {/* Loading */}
        {loading&&(
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{width:"40px",height:"40px",border:`2px solid ${C.amberLight}`,borderTop:`2px solid ${C.amber}`,borderRadius:"50%",animation:"spin 0.85s linear infinite",margin:"0 auto 14px"}}/>
            <p style={{color:C.textLight,fontSize:"13px"}}>
              {landedCountry && COUNTRIES.find(c=>c.value===landedCountry)?.flag} Thinking about tonight's dinner…
            </p>
          </div>
        )}

        {/* Error */}
        {error&&!loading&&(
          <div style={{background:"#fff5f5",border:"1px solid #e8a0a0",borderRadius:"12px",padding:"14px 18px",color:C.red,fontSize:"13px",marginBottom:"18px"}}>
            {error}<br/>
            <button onClick={()=>landedCountry&&handleSpinComplete(landedCountry)} style={{marginTop:"10px",background:"none",border:"1px solid #e8a0a0",color:C.red,borderRadius:"8px",padding:"6px 12px",cursor:"pointer",fontSize:"12px"}}>Try again</button>
          </div>
        )}

        {/* Dish */}
        {dish&&!loading&&<DishCard dish={dish} youtubeUrl={youtubeUrl}/>}
      </div>

      <SettingsDrawer open={settingsOpen} onClose={()=>setSettingsOpen(false)} settings={settings} onSave={handleSaveSettings}/>
    </div>
  );
}