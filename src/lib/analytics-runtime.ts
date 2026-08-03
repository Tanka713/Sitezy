export interface PublicAnalyticsRuntimeConfig {
  projectId: string | null;
  endpoint: string | null;
  enableSitezyAnalytics: boolean;
  ga4MeasurementId: string | null;
  metaPixelId: string | null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildAnalyticsRuntimeMarkup(config?: PublicAnalyticsRuntimeConfig | null): string {
  if (!config) return "";

  const ga4MeasurementId = String(config.ga4MeasurementId ?? "").trim();
  const metaPixelId = String(config.metaPixelId ?? "").trim();
  const hasFirstParty = Boolean(config.enableSitezyAnalytics && config.projectId && config.endpoint);

  const firstPartyScript = hasFirstParty
    ? `<script>
    (function(){
      var projectId = ${JSON.stringify(config.projectId)};
      var endpoint = ${JSON.stringify(config.endpoint)};
      var visitorKey = "sitezy:analytics:visitor:" + projectId;
      var sessionKey = "sitezy:analytics:session:" + projectId;
      var sessionSeenKey = "sitezy:analytics:session-seen:" + projectId;
      var visitorId = window.localStorage.getItem(visitorKey);
      if(!visitorId){
        visitorId = (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
        window.localStorage.setItem(visitorKey, visitorId);
      }
      var sessionId = window.sessionStorage.getItem(sessionKey);
      if(!sessionId){
        sessionId = (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
        window.sessionStorage.setItem(sessionKey, sessionId);
      }

      function send(eventType){
        if(!endpoint) return;
        var payload = {
          eventType: eventType,
          pagePath: window.location.pathname || "/",
          sessionId: sessionId,
          visitorId: visitorId,
          referrer: document.referrer || null
        };
        var body = JSON.stringify(payload);
        try{
          if(navigator.sendBeacon){
            var blob = new Blob([body], { type: "application/json" });
            navigator.sendBeacon(endpoint, blob);
            return;
          }
        }catch(error){}

        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          credentials: "same-origin",
          keepalive: true
        }).catch(function(){});
      }

      window.__sitezyAnalytics = { projectId: projectId, sessionId: sessionId, visitorId: visitorId };

      if(!window.sessionStorage.getItem(sessionSeenKey)){
        window.sessionStorage.setItem(sessionSeenKey, "1");
        send("session");
      }
      send("page_view");
    })();
  <\/script>`
    : "";

  const ga4Markup = ga4MeasurementId
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(ga4MeasurementId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", ${JSON.stringify(ga4MeasurementId)}, { send_page_view: true });
  <\/script>`
    : "";

  const metaPixelMarkup = metaPixelId
    ? `<script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq("init", ${JSON.stringify(metaPixelId)});
    fbq("track", "PageView");
  <\/script>
  <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${escapeHtml(metaPixelId)}&ev=PageView&noscript=1" alt="" /></noscript>`
    : "";

  return [ga4Markup, metaPixelMarkup, firstPartyScript].filter(Boolean).join("\n  ");
}
