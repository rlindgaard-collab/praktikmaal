import{s as r}from"./supabase-BE_bEftw.js";const u={supervisorContent:document.getElementById("supervisor-content"),logoutButton:document.getElementById("logout-supervisor")};let p=[];async function h(){const{data:{session:e}}=await r.auth.getSession();if(!e)return window.location.href="/index.html",!1;const{data:t}=await r.from("supervisor_sessions").select("*").eq("user_id",e.user.id).gt("expires_at",new Date().toISOString()).maybeSingle();return t?!0:(alert("Vejledersession er udløbet. Log venligst ind igen."),window.location.href="/index.html",!1)}async function w(){try{const{data:e,error:t}=await r.from("goals").select("*").order("created_at",{ascending:!1});if(t)throw console.error("Goals error:",t),t;if(!e||e.length===0){p=[],v();return}const{data:a,error:s}=await r.from("user_profiles").select("*");s&&console.error("Profiles error:",s);const l=new Map;a&&a.forEach(n=>{l.set(n.user_id,n)});const o=new Map;for(const n of e){const i=n.user_id;if(!o.has(i)){const d=l.get(i);o.set(i,{id:i,email:(d==null?void 0:d.email)||`Bruger ${i.slice(0,8)}`,goals:[]})}o.get(i).goals.push(n)}p=Array.from(o.values()),v()}catch(e){console.error("Error fetching users and goals:",e),u.supervisorContent.innerHTML=`
      <p class="no-goals-message">Der opstod en fejl ved indlæsning af data. Prøv at genindlæse siden.</p>
    `}}function v(){if(p.length===0){u.supervisorContent.innerHTML=`
      <p class="no-goals-message">Ingen brugere med praktikmål fundet.</p>
    `;return}const e=p.map(t=>{const a=t.goals.map(s=>`
      <div class="goal-item" data-goal-id="${s.id}">
        <div class="goal-item-header">
          <h4 class="goal-item-title">${c(s.title)}</h4>
          <span class="goal-item-progress">${s.progress||0}%</span>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="--goal-color: ${s.color}; width: ${s.progress||0}%"></div>
        </div>
        ${s.description?`<p class="goal-item-description">${c(s.description)}</p>`:""}
        <div class="goal-details" data-goal-details="${s.id}">
          ${s.reflection?`
            <div class="goal-detail-section">
              <div class="goal-detail-label">Refleksion</div>
              <div class="goal-detail-content">${c(s.reflection)}</div>
            </div>
          `:""}
          ${s.pdf_name?`
            <div class="goal-detail-section">
              <div class="goal-detail-label">Vedhæftet fil</div>
              <a href="#" class="goal-file-link" data-pdf-data="${s.pdf_data}" data-pdf-name="${c(s.pdf_name)}" data-pdf-type="${s.pdf_type}">
                📎 ${c(s.pdf_name)} (${y(s.pdf_size)})
              </a>
            </div>
          `:""}
        </div>
        <div class="expand-indicator">Klik for detaljer ↓</div>
      </div>
    `).join("");return`
      <div class="user-section" data-user-id="${t.id}">
        <div class="user-info-card">
          <div class="user-info-header">
            <div class="user-info-label">Bruger Information</div>
          </div>
          <div class="user-info-details">
            <div class="user-info-row">
              <span class="user-info-label-text">Email:</span>
              <span class="user-info-value">${c(t.email)}</span>
            </div>
            <div class="user-info-row">
              <span class="user-info-label-text">Bruger ID:</span>
              <span class="user-info-value">${t.id.slice(0,8)}...</span>
            </div>
            <div class="user-info-row">
              <span class="user-info-label-text">Antal mål:</span>
              <span class="user-info-value">${t.goals.length}</span>
            </div>
          </div>
        </div>
        <div class="user-goals">
          ${a||'<p class="no-goals-message">Ingen mål endnu</p>'}
        </div>
      </div>
    `}).join("");u.supervisorContent.innerHTML=e,$()}function $(){document.querySelectorAll(".goal-item").forEach(a=>{a.addEventListener("click",s=>{if(s.target.classList.contains("goal-file-link")){s.stopPropagation(),m(s);return}const l=a.dataset.goalId,o=document.querySelector(`[data-goal-details="${l}"]`),n=a.querySelector(".expand-indicator");if(o){const i=o.classList.contains("is-expanded");o.classList.toggle("is-expanded"),n.textContent=i?"Klik for detaljer ↓":"Luk detaljer ↑"}})}),document.querySelectorAll(".goal-file-link").forEach(a=>{a.addEventListener("click",m)})}function m(e){e.preventDefault(),e.stopPropagation();const t=e.currentTarget,a=t.dataset.pdfData,s=t.dataset.pdfName,l=t.dataset.pdfType;if(a){const o=atob(a),n=new Uint8Array(o.length);for(let f=0;f<o.length;f++)n[f]=o.charCodeAt(f);const i=new Blob([n],{type:l}),d=URL.createObjectURL(i),g=document.createElement("a");g.href=d,g.download=s,g.click(),URL.revokeObjectURL(d)}}function c(e){return e?e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}function y(e){if(!e)return"0 B";const t=1024,a=["B","KB","MB"],s=Math.floor(Math.log(e)/Math.log(t));return Math.round(e/Math.pow(t,s)*100)/100+" "+a[s]}async function L(){try{const{data:{session:e}}=await r.auth.getSession();e&&await r.from("supervisor_sessions").delete().eq("user_id",e.user.id),await r.auth.signOut(),window.location.href="/index.html"}catch(e){console.error("Error logging out:",e),alert("Der opstod en fejl ved log ud")}}async function k(){await h()&&(await w(),u.logoutButton&&u.logoutButton.addEventListener("click",L))}k();
