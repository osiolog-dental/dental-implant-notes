import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/*
  Public help guide — osiolog.com/help (no login needed).
  Same content as the published Osiolog User Guide; screenshots and the PDF
  live in /public/guide-assets (not /public/help, which would clash with the /help route). Styles are scoped under .osg-help so nothing leaks
  into the rest of the app.
*/
const BASE = process.env.PUBLIC_URL || '';
const IMG = `${BASE}/guide-assets/img`;
const PDF = `${BASE}/guide-assets/Osiolog-User-Guide.pdf`;

const CSS = "\n.osg-help{\n  --bg:#F9F9F8; --surface:#FFFFFF; --ink:#2A2F35; --ink-2:#5C6773; --ink-3:#8A949D; --line:#E5E5E2;\n  --brand:#82A098; --brand-deep:#5F7F77; --accent:#C27E70; --tint:#EEF3F1; --note:#FBF3EF; --warn:#DC2626;\n  --shot-ground:#FFFFFF;\n  color-scheme:light;\n}\n.osg-help, .osg-help *{box-sizing:border-box}\n.osg-help{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 \"IBM Plex Sans\",system-ui,-apple-system,\"Segoe UI\",sans-serif}\n.osg-help a{color:var(--brand-deep)}\n.osg-help .wrap{max-width:1180px;margin:0 auto;padding-inline:clamp(16px,3vw,32px);padding-block:40px 80px;display:grid;grid-template-columns:230px minmax(0,1fr);gap:48px}\n@media (max-width:900px){\n.osg-help .wrap{grid-template-columns:1fr;gap:24px}}\n.osg-help header.hero{grid-column:1/-1;border-bottom:1px solid var(--line);padding-bottom:28px}\n.osg-help .eyebrow{font:500 12px/1 \"IBM Plex Mono\",ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--brand-deep)}\n.osg-help h1{font:600 clamp(30px,4vw,42px)/1.1 \"Work Sans\",system-ui,sans-serif;margin:12px 0 12px;letter-spacing:-.015em;text-wrap:balance}\n.osg-help .lede{max-width:68ch;color:var(--ink-2);margin:0;font-size:17px}\n.osg-help .meta{margin-top:16px;display:flex;flex-wrap:wrap;gap:8px 18px;font-size:13px;color:var(--ink-3)}\n.osg-help nav.toc{position:sticky;top:calc(env(safe-area-inset-top,0px) + 76px);align-self:start;font-size:14px}\n@media (max-width:900px){\n.osg-help nav.toc{position:static}}\n.osg-help nav.toc p{font:500 11px/1 \"IBM Plex Mono\",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:0 0 10px}\n.osg-help nav.toc ol{list-style:none;margin:0;padding:0;display:grid;gap:2px;counter-reset:toc}\n.osg-help nav.toc li{counter-increment:toc}\n.osg-help nav.toc a{display:flex;gap:10px;padding:5px 8px;border-radius:6px;text-decoration:none;color:var(--ink-2)}\n.osg-help nav.toc a::before{content:counter(toc,decimal-leading-zero);font:500 11px/1.9 \"IBM Plex Mono\",monospace;color:var(--ink-3);min-width:18px}\n.osg-help nav.toc a:hover{background:var(--tint);color:var(--ink)}\n@media (max-width:900px){\n.osg-help nav.toc ol{grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}}\n.osg-help main{min-width:0}\n.osg-help section{padding-block:34px;border-bottom:1px solid var(--line);scroll-margin-top:16px}\n.osg-help section:first-child{padding-top:0}\n.osg-help section:last-child{border-bottom:0}\n.osg-help .part{font:500 11px/1 \"IBM Plex Mono\",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin:0 0 8px}\n.osg-help h2{font:600 26px/1.2 \"Work Sans\",system-ui,sans-serif;margin:0 0 10px;letter-spacing:-.01em;text-wrap:balance}\n.osg-help h3{font:600 18px/1.3 \"Work Sans\",system-ui,sans-serif;margin:26px 0 8px}\n.osg-help p{max-width:70ch;margin:0 0 12px}\n.osg-help .intro{color:var(--ink-2)}\n.osg-help ol.steps{margin:14px 0 18px;padding:0;list-style:none;counter-reset:s;display:grid;gap:10px;max-width:72ch}\n.osg-help ol.steps li{counter-increment:s;display:grid;grid-template-columns:30px 1fr;gap:12px;align-items:start}\n.osg-help ol.steps li::before{content:counter(s);width:26px;height:26px;border-radius:50%;background:var(--brand);color:#fff;font:600 13px/26px \"IBM Plex Sans\",sans-serif;text-align:center;margin-top:1px}\n.osg-help .btn{display:inline-block;font-size:.92em;font-weight:600;padding:0 7px;border-radius:5px;border:1px solid var(--line);background:var(--surface);white-space:nowrap}\n.osg-help .tip{max-width:72ch;margin:14px 0;padding:12px 16px;border-radius:10px;background:var(--note);border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);font-size:15px}\n.osg-help .tip strong{color:var(--accent)}\n.osg-help .warn{color:var(--warn);font-weight:600}\n.osg-help figure{margin:18px 0 8px;background:var(--shot-ground);border:1px solid var(--line);border-radius:12px;padding:10px;box-shadow:0 1px 2px rgba(0,0,0,.05)}\n.osg-help figure img{display:block;width:100%;max-width:100%;height:auto;border-radius:6px}\n.osg-help figure.narrow{max-width:560px}\n.osg-help figure.mid{max-width:760px}\n.osg-help figcaption{font-size:13px;color:#5C6773;padding:8px 4px 2px}\n.osg-help .pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;align-items:start}\n.osg-help .pair figure{margin:18px 0 8px}\n.osg-help .legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:14px;color:var(--ink-2);margin:10px 0 4px}\n.osg-help .legend span{display:inline-flex;align-items:center;gap:7px}\n.osg-help .legend i{width:16px;height:4px;border-radius:2px;background:var(--c)}\n.osg-help .tabl{max-width:72ch;border-collapse:collapse;font-size:15px;margin:10px 0 16px;width:100%}\n.osg-help .tabl th,.osg-help .tabl td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}\n.osg-help .tabl th{font-weight:600;color:var(--ink-2);font-size:13px}\n.osg-help .table-wrap{overflow-x:auto}\n.osg-help footer{grid-column:1/-1;border-top:1px solid var(--line);padding-top:18px;font-size:13px;color:var(--ink-3)}\n.osg-help :focus-visible{outline:2px solid var(--brand-deep);outline-offset:2px}\n@media print{\n.osg-help nav.toc{display:none}\n.osg-help .osg-help .wrap{grid-template-columns:1fr}\n.osg-help .osg-help section{break-inside:avoid-page}\n.osg-help .osg-help figure{break-inside:avoid}}\n\n.osg-help .topbar{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.94);backdrop-filter:blur(6px);border-bottom:1px solid var(--line);padding-top:env(safe-area-inset-top,0px)}\n.osg-help .topbar-in{max-width:1180px;margin:0 auto;padding:12px clamp(16px,3vw,32px);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\n.osg-help .brand{font:600 18px/1 \"Work Sans\",sans-serif;letter-spacing:.02em;color:var(--ink);text-decoration:none}\n.osg-help .top-actions{display:flex;gap:8px;flex-wrap:wrap}\n.osg-help .top-actions a{font:600 13px/1 \"IBM Plex Sans\",sans-serif;padding:9px 14px;border-radius:8px;border:1px solid var(--line);color:var(--ink);background:var(--surface);text-decoration:none}\n.osg-help .top-actions a.primary{background:var(--brand);border-color:var(--brand);color:#fff}\n";

export default function HelpGuide() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Osiolog User Guide';
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="osg-help" data-testid="help-guide">
      <style>{CSS}</style>
      <div className="topbar">
        <div className="topbar-in">
          <Link to="/" className="brand" data-testid="help-back-home">OSIOLOG</Link>
          <div className="top-actions">
            <a href={PDF} download="Osiolog User Guide.pdf" className="primary" data-testid="help-download-pdf">Download PDF</a>
            <Link to="/" data-testid="help-open-app">Open Osiolog</Link>
          </div>
        </div>
      </div>
      <div className="wrap">
        <header className="hero">
          <div className="eyebrow">Osiolog · For dentists &amp; implantologists</div>
          <h1>Osiolog User Guide</h1>
          <p className="lede">A step-by-step walk through Osiolog, from signing in to charting implants, recording failures and tracking your clinic and consulting finances. Every screenshot is from the live app, using made-up sample patients.</p>
          <div className="meta"><span>osiolog.com</span><span>Updated September 2026</span></div>
        </header>
      
        <nav className="toc" aria-label="Contents">
          <p>Contents</p>
          <ol>
            <li><a href="#sign-in">Sign in</a></li>
            <li><a href="#dashboard">Your dashboard</a></li>
            <li><a href="#clinics">Add your clinics</a></li>
            <li><a href="#patients">Add a patient</a></li>
            <li><a href="#patient-page">The patient page</a></li>
            <li><a href="#chart">The panoramic chart</a></li>
            <li><a href="#missing">Missing teeth</a></li>
            <li><a href="#implant">Log an implant</a></li>
            <li><a href="#zygomatic">Zygomatic &amp; pterygoid</a></li>
            <li><a href="#abutment">Abutments</a></li>
            <li><a href="#crown">Crowns &amp; bridges</a></li>
            <li><a href="#extraction">Extractions &amp; grafts</a></li>
            <li><a href="#fullarch">Overdentures &amp; full mouth rehab</a></li>
            <li><a href="#stages">Healing &amp; second stage</a></li>
            <li><a href="#failed">Failed implants</a></li>
            <li><a href="#finances">Finances</a></li>
            <li><a href="#more">Photos, reports, stock, backup</a></li>
          </ol>
        </nav>
      
        <main>
          <section id="sign-in">
            <p className="part">Getting started</p>
            <h2>1. Sign in</h2>
            <ol className="steps">
              <li><span>Open <strong>osiolog.com</strong> in your browser.</span></li>
              <li><span>Click <span className="btn">Continue with Google</span>, or type your email and password and click <span className="btn">Sign In</span>.</span></li>
              <li><span>New to Osiolog? Click <strong>Register here</strong> below the Sign In button. To look around first without registering, click <span className="btn">Use Demo Account</span>.</span></li>
            </ol>
            <figure><img src={`${IMG}/01-login.png`} alt="Osiolog sign-in page with Google sign-in, email and password fields, and a Use Demo Account button" loading="lazy" /><figcaption>The sign-in page.</figcaption></figure>
          </section>
      
          <section id="dashboard">
            <h2>2. Your dashboard</h2>
            <p className="intro">After signing in you land on the dashboard. It answers one question: <em>what needs my attention today?</em></p>
            <ol className="steps">
              <li><span>The four cards count your <strong>active</strong>, <strong>completed</strong>, <strong>guarded</strong> and <strong>failed</strong> cases. Click a card to see those patients.</span></li>
              <li><span><strong>Ready for Second Stage</strong> lists patients whose implants have passed their healing period. The number shows how many implants, and <em>Day 148 of 90</em> means 148 days since placement against a 90-day plan. Click a row to open that patient.</span></li>
              <li><span>The <strong>bell</strong> at the top right shows the same reminders, plus follow-ups due this week and extraction sites due for an implant. The same reminders also come as a daily email.</span></li>
            </ol>
            <figure><img src={`${IMG}/02-dashboard.png`} alt="Dashboard with case counters, a Ready for Second Stage list of two sample patients, and totals" loading="lazy" /><figcaption>Dashboard. The left menu takes you to Patients, Analytics, Stock, Clinics, Backup and Subscription.</figcaption></figure>
          </section>
      
          <section id="clinics">
            <h2>3. Add your clinics</h2>
            <p className="intro">Add every clinic you work at, including the ones where you only visit as a consultant. Your role at each clinic decides which finances you see.</p>
            <ol className="steps">
              <li><span>Click <strong>Clinics</strong> in the left menu, then <span className="btn">+ Add Clinic</span>.</span></li>
              <li><span>Optional: paste the clinic's <strong>Google Maps link</strong> and click <span className="btn">Fetch Details</span> to fill in the name and address.</span></li>
              <li><span>Under <strong>My role at this clinic</strong>, choose <span className="btn">Clinic owner</span> for your own clinic, or <span className="btn">Consultant</span> if you visit to treat patients and are paid a fee.</span></li>
              <li><span>Fill in the address and phone, then click <span className="btn">Add Clinic</span>. The card shows <strong>My clinic</strong> or <strong>I consult here</strong>.</span></li>
            </ol>
            <div className="pair">
              <figure><img src={`${IMG}/03-clinics.png`} alt="Clinics page with one clinic card labelled My clinic" loading="lazy" /><figcaption>Your clinics, each with its role.</figcaption></figure>
              <figure className="narrow"><img src={`${IMG}/04-clinic-form.png`} alt="Edit Clinic form showing the My role at this clinic choice: Clinic owner or Consultant" loading="lazy" /><figcaption>The role choice in the clinic form.</figcaption></figure>
            </div>
            <div className="tip"><strong>Free plan:</strong> the free plan allows one clinic. To add more, upgrade from <strong>Subscription</strong>.</div>
      
            <h3>Choose which finances you see</h3>
            <p>Beside the bell there is a small wallet button. Click it and choose what money to show: <span className="btn">Both</span>, <span className="btn">Clinic owner</span> (your clinic's charges, payments and costs) or <span className="btn">Consultant</span> (only the fees you earn at clinics where you consult). Your choice is saved to your account, so your phone and computer show the same view.</p>
            <figure className="narrow"><img src={`${IMG}/19-finance-view-menu.png`} alt="Show finances as menu with Both, Clinic owner and Consultant" loading="lazy" /><figcaption>The "Show finances as" menu beside the bell.</figcaption></figure>
          </section>
      
          <section id="patients">
            <h2>4. Add a patient</h2>
            <ol className="steps">
              <li><span>Click <strong>Patients</strong> in the left menu. Use the search box to find someone, or the letters on the right edge to jump.</span></li>
              <li><span>Click <span className="btn">+ Add Patient</span>.</span></li>
              <li><span>Enter the name, age and gender. Then choose the <strong>Clinic</strong> this patient belongs to. It decides whether their finances count as your clinic's or as your consulting.</span></li>
              <li><span>Phone, email, address and medical history are optional; you can add them later. Click <span className="btn">Add Patient</span>.</span></li>
            </ol>
            <div className="pair">
              <figure><img src={`${IMG}/05-patients.png`} alt="Patients list filtered by the word sample, showing one patient card" loading="lazy" /><figcaption>The patient list, filtered with the search box.</figcaption></figure>
              <figure className="narrow"><img src={`${IMG}/06-add-patient.png`} alt="Add New Patient form with name, age, gender, clinic, phone, email and address" loading="lazy" /><figcaption>Add New Patient, including the Clinic choice.</figcaption></figure>
            </div>
            <div className="tip"><strong>Good to know:</strong> if you leave the clinic empty, the first implant or abutment you log with a clinic fills it in for you.</div>
          </section>
      
          <section id="patient-page">
            <h2>5. The patient page</h2>
            <p className="intro">Click a patient to open their page. From top to bottom: details, finances, the chart, then every record.</p>
            <ol className="steps">
              <li><span>The top shows the patient's details and their <strong>clinic</strong>, with a <strong>My clinic</strong> or <strong>I consult here</strong> badge.</span></li>
              <li><span><span className="btn">Edit Details</span> changes the patient's details or clinic. <span className="btn">Export PDF</span> downloads a full clinical report. <span className="btn">History</span> shows every change made to the patient's details.</span></li>
            </ol>
            <figure><img src={`${IMG}/07-patient-header.png`} alt="Patient header with name, age, clinic badge and Edit Details, Export PDF and History buttons" loading="lazy" /><figcaption>The top of a patient's page.</figcaption></figure>
          </section>
      
          <section id="chart">
            <p className="part">Charting</p>
            <h2>6. The panoramic chart</h2>
            <p className="intro">The chart is drawn like a panoramic X-ray (OPG), using FDI tooth numbers. It is an <strong>illustration</strong> of what you have recorded, not a radiograph and not to scale.</p>
            <ol className="steps">
              <li><span><strong>Pick a tooth:</strong> click it on the drawing, or click its number in the <strong>Tooth sites</strong> grid under the chart.</span></li>
              <li><span><strong>Read its records:</strong> the panel on the right shows everything saved for that tooth: implant brand and size, torque, ISQ, dates, abutment, crown and lab.</span></li>
              <li><span><strong>Add a record:</strong> the buttons in the panel open the matching form, with the tooth number already filled in. The chart redraws as soon as you save.</span></li>
              <li><span><strong>This case</strong> at the bottom of the panel totals the whole mouth: implants by type, abutments, crowns, bridges and missing teeth.</span></li>
            </ol>
            <figure><img src={`${IMG}/08-chart.png`} alt="Panoramic chart of a sample patient with tooth 36 selected and its implant, abutment and crown details in the side panel" loading="lazy" /><figcaption>Tooth 36 selected: its implant, abutment and crown appear on the right. The tags in the grid (IMP, CRN, PON, MISS, PLAN, FAIL) summarise each tooth.</figcaption></figure>
            <p>Colours used on the chart and in the grid:</p>
            <div className="legend">
              <span style={{ '--c': '#DC2626' }}><i></i>Failed, waiting to be removed</span>
              <span style={{ '--c': '#2563EB' }}><i></i>Missing / extracted</span>
              <span style={{ '--c': '#A16207' }}><i></i>Grafted socket</span>
              <span style={{ '--c': '#0369A1' }}><i></i>Implant (dashed = planned)</span>
              <span style={{ '--c': '#B04A33' }}><i></i>Zygomatic</span>
              <span style={{ '--c': '#9A6B12' }}><i></i>Pterygoid</span>
              <span style={{ '--c': '#16A34A' }}><i></i>Crown / bridge</span>
              <span style={{ '--c': '#7C3AED' }}><i></i>Overdenture</span>
              <span style={{ '--c': '#4F46E5' }}><i></i>Full mouth rehab</span>
            </div>
            <div className="tip"><strong>Classic chart:</strong> on paid plans, the <span className="btn">Switch to classic chart</span> button above the chart shows the older tooth-by-tooth chart instead. The free plan shows the classic chart only. Both charts use the same records and forms.</div>
          </section>
      
          <section id="missing">
            <h2>7. Record missing teeth</h2>
            <ol className="steps">
              <li><span>Select any tooth, then click <span className="btn">Missing</span> in the panel.</span></li>
              <li><span>In the window that opens, tap every tooth that is missing. You can mark several at once.</span></li>
              <li><span>Click the red button to save. Missing teeth show as faint outlines tagged <strong>MISS</strong>.</span></li>
              <li><span>To undo, select the tooth and click <span className="btn">Undo missing</span>.</span></li>
            </ol>
            <figure className="narrow"><img src={`${IMG}/09-missing.png`} alt="Mark Teeth as Missing window with a grid of upper and lower teeth and tooth 17 selected" loading="lazy" /><figcaption>Several teeth can be marked missing at once.</figcaption></figure>
          </section>
      
          <section id="implant">
            <h2>8. Log an implant</h2>
            <ol className="steps">
              <li><span>Select the tooth, then click <span className="btn">Implant</span> in the panel.</span></li>
              <li><span>Optional: upload a photo of the implant's <strong>tag or package label</strong>. If it has a QR code, the form fills itself in.</span></li>
              <li><span>Fill in the brand, system, diameter and length, plus torque and ISQ if you measured them. Then the approach, surgery date, follow-up date and <strong>clinic</strong>. The clinic starts as the patient's clinic.</span></li>
              <li><span>Tick any that apply: cover screw, healing abutment, membrane, pterygoid, zygomatic or subperiosteal. Then save.</span></li>
            </ol>
            <figure className="mid"><img src={`${IMG}/10-implant-form.png`} alt="Add Implant form for tooth 16 with tag upload, tooth number, brand, diameter, length, torque, ISQ and other fields" loading="lazy" /><figcaption>The implant form opened from the chart, with tooth 16 already filled in.</figcaption></figure>
            <div className="tip"><strong>Several implants in one visit?</strong> Use <span className="btn">Add Multiple Implants</span> above the chart to enter them all in one table.</div>
          </section>
      
          <section id="zygomatic">
            <h2>9. Zygomatic and pterygoid implants</h2>
            <p className="intro">On the panoramic chart these are drawn from the crest up into the zygoma or the pterygoid plate, with their length.</p>
            <ol className="steps">
              <li><span>Select an upper tooth: 12–16 or 22–26 for zygomatic, 17, 18, 27 or 28 for pterygoid. Buttons that don't apply to that tooth are greyed out.</span></li>
              <li><span>Click <span className="btn">Zygomatic</span> or <span className="btn">Pterygoid</span>. The normal implant form opens with that box <strong>already ticked</strong>.</span></li>
              <li><span>Enter the length (for example 42.5 or 45 mm) and save. Teeth 12–13 and 22–23 are drawn on the anterior path, 14–16 and 24–26 on the posterior path.</span></li>
            </ol>
            <div className="pair">
              <figure><img src={`${IMG}/22-full-arch-chart.png`} alt="Full-arch sample: four zygomatic and two pterygoid implants under an upper full mouth rehab, with a lower overdenture on two locator implants" loading="lazy" /><figcaption>Four zygomatic and two pterygoid implants under an upper full mouth rehab, with a lower locator overdenture.</figcaption></figure>
              <figure><img src={`${IMG}/23-zygomatic-ticked.png`} alt="Implant form with the Zygomatic box ticked" loading="lazy" /><figcaption>Clicking Zygomatic opens the form with the box ticked.</figcaption></figure>
            </div>
          </section>
      
          <section id="abutment">
            <h2>10. Abutments</h2>
            <ol className="steps">
              <li><span>Select the implant's tooth and click <span className="btn">Abutment</span>.</span></li>
              <li><span>Optional: upload the abutment's tag photo.</span></li>
              <li><span>Choose the type: stock, MUA straight or angled, ball, locator, custom milled, UCLA or Ti base. Then the brand, size, placement date and clinic. Save.</span></li>
              <li><span>Each type has its own shape on the chart: tapered stock, MUA cone, <strong>ball</strong> (a post with a ball) and <strong>locator</strong> (a low flat cap).</span></li>
            </ol>
            <figure className="narrow"><img src={`${IMG}/11-abutment-form.png`} alt="Abutment Log form with tag upload, tooth number, placement date and clinic" loading="lazy" /><figcaption>The abutment form.</figcaption></figure>
          </section>
      
          <section id="crown">
            <h2>11. Crowns and bridges</h2>
            <ol className="steps">
              <li><span>Select a tooth and click <span className="btn">Crown / Bridge</span>.</span></li>
              <li><span>For a bridge, click every tooth in the span on the small chart at the top of the form, including the missing ones. Missing teeth in a bridge become <strong>pontics</strong>.</span></li>
              <li><span>Fill in the loading date, crown type (screw or cement retained), material and lab, then save. On the chart, crowns get a green outline and bridges a green connector.</span></li>
            </ol>
            <figure className="mid"><img src={`${IMG}/12-crown-form.png`} alt="FPD Log Sheet with a small tooth chart to select bridge teeth, loading date, crown count, type and material" loading="lazy" /><figcaption>The crown / bridge form. Pick the teeth in the span on the small chart.</figcaption></figure>
          </section>
      
          <section id="extraction">
            <h2>12. Extractions, grafts and planned implants</h2>
            <ol className="steps">
              <li><span>Select the tooth and click <span className="btn">Extracted</span>. The form opens with that tooth already selected; add others if you extracted more on the same day.</span></li>
              <li><span>Enter the extraction date. If you grafted, choose the <strong>bone graft</strong> and tick <strong>membrane</strong> if used.</span></li>
              <li><span>If an implant will go here later, tick <strong>Implant planned here later</strong> and enter how many days to wait.</span></li>
              <li><span>Save. On the chart a grafted socket shows dotted, and a planned implant shows as a dashed outline. When the waiting period is over, you get a "due for implant" reminder.</span></li>
            </ol>
            <div className="pair">
              <figure><img src={`${IMG}/16-extraction-form.png`} alt="Extracted Teeth Log with date, tooth grid, bone graft, membrane and implant planned options" loading="lazy" /><figcaption>The extraction form.</figcaption></figure>
              <figure className="narrow"><img src={`${IMG}/13-grafted-panel.png`} alt="Side panel for tooth 26: extracted, waiting for implant, xenograft, membrane, implant due date" loading="lazy" /><figcaption>A grafted site waiting for an implant, with its due date.</figcaption></figure>
            </div>
            <div className="tip"><strong>Immediate implants:</strong> if you log an extraction and an implant on the same tooth and date, Osiolog offers to mark the implant as immediate placement, and the chart tags it <strong>IMM</strong>.</div>
          </section>
      
          <section id="fullarch">
            <h2>13. Overdentures and full mouth rehab</h2>
            <ol className="steps">
              <li><span>Log the supporting implants first; each needs its own record.</span></li>
              <li><span>Click <span className="btn">Overdenture</span> or <span className="btn">Full mouth rehab</span> under <strong>Whole arch</strong> in the panel.</span></li>
              <li><span>For full mouth rehab, choose the type (Upper FMR, Lower FMR, both arches, hybrid or Malo). Leave <strong>Mark all upper teeth as missing</strong> ticked if the natural teeth are gone.</span></li>
              <li><span>Tick the connected implants, add the loading date and save. For an overdenture, also choose the attachment (ball, locator, bar, magnet and others). A bar is drawn joining the implants, with clips.</span></li>
            </ol>
            <figure className="narrow"><img src={`${IMG}/24-fmr-form.png`} alt="Full Mouth Rehab Log with type, mark teeth missing, connected implants and loading date" loading="lazy" /><figcaption>The full mouth rehab form.</figcaption></figure>
          </section>
      
          <section id="stages">
            <p className="part">Follow-up</p>
            <h2>14. Healing and second stage</h2>
            <ol className="steps">
              <li><span>Scroll down to <strong>Implant Records</strong>. Each implant shows its three stages: placement, second stage / impressions, and prosthesis delivery.</span></li>
              <li><span>The <strong>Osseointegration</strong> bar counts the days since surgery. Click <strong>Edit period</strong> to change the 90-day default for that implant.</span></li>
              <li><span>When the bar says <strong>Ready for Stage 2</strong>, click <span className="btn">Mark: Second Stage / Impressions</span> once it's done, and later <span className="btn">Mark: Prosthesis Delivery</span>. Use <span className="btn">Revert</span> to step back if you marked one by mistake.</span></li>
            </ol>
            <figure><img src={`${IMG}/17-implant-records.png`} alt="Implant Records list with stage trackers, one implant ready for stage 2, and a failed implant card in red" loading="lazy" /><figcaption>Implant Records. The red card is a failed implant; see the next section.</figcaption></figure>
          </section>
      
          <section id="failed">
            <h2>15. Failed implants</h2>
            <p className="intro">A failed implant goes through two stages: first it is still in place, waiting to be removed; then it is removed and the site is empty again.</p>
            <ol className="steps">
              <li><span>Scroll to <strong>Implant Records</strong>, click the pencil icon on the implant, and set <strong>Outcome</strong> to <span className="warn">Failed</span>. Leave <strong>Removed on</strong> empty. The implant turns <span className="warn">red</span> on the chart and leaves the second-stage and follow-up reminders.</span></li>
              <li><span>When you remove it, select the tooth and click the red <span className="btn">Record removal</span>. Enter the <strong>Removed on</strong> date and save.</span></li>
              <li><span>The <strong>Extracted Teeth</strong> form then opens with that site and date filled in. Record any graft and whether a new implant is planned, with the waiting days. To skip, close the form.</span></li>
              <li><span>The site now shows empty, or grafted with a planned implant. The records list shows <span className="warn">Failed — removed on (date)</span> and <strong>Failed implant removed — Tooth site 24</strong>.</span></li>
            </ol>
            <div className="pair">
              <figure className="narrow"><img src={`${IMG}/14-failed-panel.png`} alt="Side panel for tooth 24: failed implant waiting to be removed, with a red Record removal button" loading="lazy" /><figcaption>A failed implant waiting to be removed.</figcaption></figure>
              <figure><img src={`${IMG}/15-record-removal.png`} alt="Implant form with the red Removed on date box" loading="lazy" /><figcaption>The <em>Removed on</em> date appears when the outcome is Failed.</figcaption></figure>
            </div>
            <figure><img src={`${IMG}/18-extraction-records.png`} alt="Extraction records list" loading="lazy" /><figcaption>Extraction and implant-removal records appear together, below the implant records.</figcaption></figure>
          </section>
      
          <section id="finances">
            <p className="part">Money</p>
            <h2>16. Finances</h2>
            <p className="intro">Every patient has a <strong>Financials</strong> box near the top of their page. Your role at the patient's clinic decides what it shows:</p>
            <div className="table-wrap"><table className="tabl">
              <thead><tr><th>Patient's clinic</th><th>What you see</th></tr></thead>
              <tbody>
                <tr><td>Your own clinic</td><td>Charged to patient, clinic cost, payments received, balance due, clinic profit.</td></tr>
                <tr><td>A clinic where you consult</td><td>Only your fees, your own material and other costs, and your profit. There's no payments box, because the patient pays that clinic, not you.</td></tr>
                <tr><td>No clinic set</td><td>Whatever you chose in "Show finances as" beside the bell.</td></tr>
              </tbody>
            </table></div>
            <h3>Log costs and charges</h3>
            <ol className="steps">
              <li><span>Open <strong>Financials</strong> and click <span className="btn">+ Log Costs</span>. Every implant, abutment and crown for the patient is listed, each with its clinic.</span></li>
              <li><span>For your own clinic's work, fill in the <strong>material cost</strong>, <strong>other expenses</strong> and what you <strong>charged the patient</strong>. If a <strong>visiting consultant</strong> did the procedure, choose that and enter their fee.</span></li>
              <li><span>At a clinic where you consult, the row is marked <strong>My consulting</strong>: enter the <strong>fee you receive</strong> and your own costs.</span></li>
              <li><span>Use <span className="btn">+ Lab / Consultant / Other Charge</span> for anything else, then <span className="btn">Save All</span>.</span></li>
              <li><span>Record money the patient pays with <span className="btn">+ Payment</span>. The balance due updates.</span></li>
            </ol>
            <div className="pair">
              <figure><img src={`${IMG}/21-log-costs.png`} alt="Log Costs and Charges window listing implants with clinic, material cost, other expenses and charged amounts" loading="lazy" /><figcaption>Log Costs: one row per procedure.</figcaption></figure>
              <figure><img src={`${IMG}/20-financials.png`} alt="Financials box with totals, cost lines and payments received" loading="lazy" /><figcaption>A patient's Financials at your own clinic.</figcaption></figure>
            </div>
            <h3>See the whole practice</h3>
            <p>Click <strong>Analytics</strong> in the left menu. The <strong>Financial Summary</strong> totals your real costs and payments for <span className="btn">This month</span>, <span className="btn">This year</span> or <span className="btn">All time</span>, with one row per clinic. It follows the "Show finances as" choice beside the bell.</p>
            <figure><img src={`${IMG}/25-analytics-finance.png`} alt="Analytics Financial Summary with period buttons, clinic totals and a per-clinic table" loading="lazy" /><figcaption>Analytics → Financial Summary.</figcaption></figure>
          </section>
      
          <section id="more">
            <p className="part">Everything else</p>
            <h2>17. Photos, reports, stock and backup</h2>
            <h3>Photo Vault</h3>
            <p>On the patient page, click <span className="btn">Photo Vault</span> under the chart. Add clinical photos or radiographs; they are sorted by date. You can use the camera on your phone.</p>
            <figure><img src={`${IMG}/26-photo-vault.png`} alt="Photo Vault page with Add New Photos and Add New Radiographs buttons" loading="lazy" /><figcaption>Photo Vault for a patient.</figcaption></figure>
            <h3>PDF report</h3>
            <p>On the patient page, click <span className="btn">Export PDF</span>. The report includes the patient's details, the chart, every record and their photos. It's ready to share with the patient or another clinician.</p>
            <h3>Stock</h3>
            <p>Click <strong>Stock</strong> in the left menu to track implants, abutments and kits you've bought. Log a purchase, or scan a catalogue. When you pick a stock item in the implant or abutment form, it is taken off your stock automatically.</p>
            <figure><img src={`${IMG}/27-stock.png`} alt="Stock Availability page with totals and Add Item and Log Purchase buttons" loading="lazy" /><figcaption>Stock.</figcaption></figure>
            <h3>Backup</h3>
            <p>Click <strong>Backup</strong> in the left menu. <span className="btn">Download Backup</span> saves all your patients and records to your computer, and <span className="btn">Download Photos (ZIP)</span> saves every photo. Restore from the same page if you ever need to.</p>
            <figure><img src={`${IMG}/28-backup.png`} alt="Backup and Restore page with Download Backup and Download Photos buttons" loading="lazy" /><figcaption>Backup &amp; Restore.</figcaption></figure>
            <div className="tip"><strong>Need help?</strong> Click your name at the top right, then <strong>Contact Us</strong>.</div>
          </section>
        </main>
      
        <footer>Osiolog User Guide. The screenshots show sample patients (Anita Rao, Ramesh Iyer) created for this guide; they are not real patients. The chart is an illustration of recorded data, not a radiograph.</footer>
      </div>
    </div>
  );
}
