import type { LeadCaptureRuntimeConfig } from "@/types";
import { buildLeadCaptureRuntimeConfig } from "@/lib/lead-capture";

function serializeRuntimeConfig(config: Partial<LeadCaptureRuntimeConfig>) {
  return JSON.stringify(buildLeadCaptureRuntimeConfig(config)).replace(/</g, "\\u003c");
}

export function buildLeadCaptureRuntimeScript(config: Partial<LeadCaptureRuntimeConfig>): string {
  const serializedConfig = serializeRuntimeConfig(config);

  return `<style data-sitezy-lead-capture>
    [data-sz-capture-feedback="1"] {
      min-height: 1.2em;
      transition: color 180ms ease, opacity 180ms ease;
    }
    [data-sz-capture-feedback-state="idle"] {
      opacity: 0;
    }
    [data-sz-capture-feedback-state="pending"] {
      opacity: 1;
      color: var(--muted, #6b7280);
    }
    [data-sz-capture-feedback-state="success"] {
      opacity: 1;
      color: #0f766e;
    }
    [data-sz-capture-feedback-state="error"] {
      opacity: 1;
      color: #b91c1c;
    }
    form[data-sz-capture-busy="1"] button[type="submit"] {
      opacity: 0.72;
      cursor: progress;
    }
  </style>
  <script>
    (function(){
      var config = ${serializedConfig};

      function normalizeText(value) {
        return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
      }

      function isLeadField(field) {
        if (!field || !field.tagName) return false;
        var tagName = String(field.tagName || "").toLowerCase();
        if (tagName !== "input" && tagName !== "textarea" && tagName !== "select") return false;
        if (field.hasAttribute("data-sz-capture-honeypot")) return false;
        var type = normalizeText(field.getAttribute("type"));
        if (
          tagName === "input" &&
          (type === "hidden" ||
            type === "submit" ||
            type === "button" ||
            type === "password" ||
            type === "search" ||
            type === "file")
        ) {
          return false;
        }
        return true;
      }

      function leadFields(form) {
        return Array.from(form.querySelectorAll("input, textarea, select")).filter(isLeadField);
      }

      function inferKind(form) {
        if (!form || form.getAttribute("data-sz-capture-kind")) return null;
        if (form.querySelector('input[type="password"], input[type="search"]')) return null;

        var fields = leadFields(form);
        if (!fields.length) return null;

        var text = normalizeText(form.textContent || "");
        var hasTextarea = fields.some(function(field){
          return String(field.tagName || "").toLowerCase() === "textarea";
        });
        var hasEmail = fields.some(function(field){
          var type = normalizeText(field.getAttribute("type"));
          return type === "email" || /\b(email|e-mail)\b/.test(normalizeText(field.getAttribute("placeholder") || ""));
        });

        if (!hasEmail && !hasTextarea) return null;

        if (
          /\b(newsletter|subscribe|subscription|updates|join|mailing list|inbox)\b/.test(text) ||
          (hasEmail && !hasTextarea && fields.length <= 2)
        ) {
          return "newsletter";
        }

        if (
          hasTextarea ||
          /\b(contact|get in touch|message|project brief|inquiry|enquiry|request)\b/.test(text)
        ) {
          return "contact";
        }

        return hasEmail ? "contact" : null;
      }

      function fieldContext(field) {
        var chunks = [];
        var placeholder = field.getAttribute("placeholder") || "";
        var ariaLabel = field.getAttribute("aria-label") || "";
        var parentLabel = field.closest("label");
        var previous = field.previousElementSibling;
        var parent = field.parentElement;
        var id = field.getAttribute("id");

        if (placeholder) chunks.push(placeholder);
        if (ariaLabel) chunks.push(ariaLabel);
        if (parentLabel) chunks.push(parentLabel.textContent || "");
        if (previous && String(previous.tagName || "").toLowerCase() === "label") {
          chunks.push(previous.textContent || "");
        }
        if (parent) {
          var nestedLabel = parent.querySelector("label");
          if (nestedLabel) chunks.push(nestedLabel.textContent || "");
        }
        if (id) {
          try {
            var explicitLabel = field.form ? field.form.querySelector('label[for="' + id.replace(/"/g, '\\"') + '"]') : null;
            if (explicitLabel) chunks.push(explicitLabel.textContent || "");
          } catch (error) {}
        }

        return normalizeText(chunks.join(" "));
      }

      function inferFieldName(field, index, kind) {
        var existingName = normalizeText(field.getAttribute("name"));
        if (existingName) return existingName;

        var tagName = String(field.tagName || "").toLowerCase();
        var type = normalizeText(field.getAttribute("type"));
        var context = fieldContext(field);

        if (type === "email") return "email";
        if (type === "tel") return "phone";
        if (type === "date") return "date";
        if (type === "time") return "time";

        if (/\bfirst name|given name\b/.test(context)) return "first_name";
        if (/\blast name|family name|surname\b/.test(context)) return "last_name";
        if (/\bcompany|brand|business\b/.test(context)) return "company";
        if (/\bsubject\b/.test(context)) return "subject";
        if (/\bphone|mobile|whatsapp\b/.test(context)) return "phone";
        if (/\bbudget\b/.test(context)) return "budget";
        if (/\bproject type|service\b/.test(context)) return "project_type";
        if (/\bgoal\b/.test(context)) return "goal";
        if (/\bparty size|guests?\b/.test(context)) return "party_size";
        if (/\bdate\b/.test(context)) return "date";
        if (/\btime\b/.test(context)) return "time";
        if (/\barea|location\b/.test(context)) return "area";
        if (/\b(full name|name)\b/.test(context)) return "name";

        if (tagName === "textarea") {
          if (/\b(message|brief|details|notes|inquiry|enquiry|how can we help|tell us)\b/.test(context)) {
            return "message";
          }
          return kind === "newsletter" ? "details" : "message";
        }

        return "field_" + String(index + 1);
      }

      function ensureSubmitControl(form, kind) {
        if (form.querySelector("button[type='submit'], input[type='submit']")) return;

        var firstButton = form.querySelector("button");
        if (firstButton) {
          firstButton.setAttribute("type", "submit");
          return;
        }

        var anchors = Array.from(form.querySelectorAll("a"));
        var primaryAnchor = anchors.find(function(anchor){
          return /\b(send|submit|join|subscribe|request|book|start|get)\b/.test(normalizeText(anchor.textContent || ""));
        }) || anchors[0];

        if (primaryAnchor) {
          var replacement = document.createElement("button");
          replacement.type = "submit";
          if (primaryAnchor.getAttribute("class")) replacement.setAttribute("class", primaryAnchor.getAttribute("class") || "");
          if (primaryAnchor.getAttribute("style")) replacement.setAttribute("style", primaryAnchor.getAttribute("style") || "");
          if (primaryAnchor.getAttribute("data-sz-widget-part")) {
            replacement.setAttribute("data-sz-widget-part", primaryAnchor.getAttribute("data-sz-widget-part") || "");
          }
          replacement.innerHTML = primaryAnchor.innerHTML || primaryAnchor.textContent || (kind === "newsletter" ? "Join" : "Send");
          primaryAnchor.replaceWith(replacement);
          return;
        }

        var fallbackButton = document.createElement("button");
        fallbackButton.type = "submit";
        fallbackButton.textContent = kind === "newsletter" ? "Join" : "Send message";
        fallbackButton.style.cssText = "padding:14px 22px;border-radius:14px;background:var(--primary, #111827);color:#ffffff;font-size:14px;font-weight:700;border:none;cursor:pointer;";
        form.appendChild(fallbackButton);
      }

      function ensureHoneypot(form) {
        if (form.querySelector("[data-sz-capture-honeypot]")) return;
        var wrapper = document.createElement("div");
        wrapper.setAttribute("aria-hidden", "true");
        wrapper.style.cssText = "position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;";

        var label = document.createElement("label");
        label.style.cssText = "display:block;font-size:11px;color:inherit;";
        label.textContent = "Leave this field empty";

        var input = document.createElement("input");
        input.type = "text";
        input.name = "website";
        input.tabIndex = -1;
        input.autocomplete = "off";
        input.setAttribute("data-sz-capture-honeypot", "1");
        input.style.cssText = "display:block;width:1px;height:1px;opacity:0;";

        label.appendChild(input);
        wrapper.appendChild(label);
        form.appendChild(wrapper);
      }

      function ensureFeedbackNode(form) {
        if (feedbackNode(form)) return;
        var node = document.createElement("p");
        node.setAttribute("data-sz-capture-feedback", "1");
        node.setAttribute("data-sz-capture-feedback-state", "idle");
        node.style.cssText = "margin:0;font-size:12px;line-height:1.6;color:var(--muted, #6b7280);";
        form.appendChild(node);
      }

      function decorateGeneratedForms() {
        Array.from(document.querySelectorAll("form")).forEach(function(form, index){
          if (form.getAttribute("data-sz-capture-kind")) return;

          var kind = inferKind(form);
          if (!kind) return;

          form.removeAttribute("onsubmit");
          form.setAttribute("data-sz-capture-kind", kind);
          if (!form.getAttribute("data-sz-capture-form-id")) {
            form.setAttribute("data-sz-capture-form-id", "generated-" + kind + "-form-" + String(index + 1));
          }

          leadFields(form).forEach(function(field, fieldIndex){
            var nextName = inferFieldName(field, fieldIndex, kind);
            if (nextName && !normalizeText(field.getAttribute("name"))) {
              field.setAttribute("name", nextName);
            }

            var type = normalizeText(field.getAttribute("type"));
            if (type === "email") {
              field.setAttribute("autocomplete", "email");
              field.setAttribute("inputmode", "email");
              if (kind === "newsletter") field.required = true;
            }
          });

          ensureSubmitControl(form, kind);
          ensureHoneypot(form);
          ensureFeedbackNode(form);
        });
      }

      function forms() {
        decorateGeneratedForms();
        return Array.from(document.querySelectorAll("form[data-sz-capture-kind]"));
      }

      function feedbackNode(form) {
        return form.querySelector("[data-sz-capture-feedback='1']");
      }

      function setFeedback(form, state, message) {
        var node = feedbackNode(form);
        if (!node) return;
        node.setAttribute("data-sz-capture-feedback-state", state || "idle");
        node.textContent = message || "";
      }

      function setBusy(form, busy) {
        if (busy) form.setAttribute("data-sz-capture-busy", "1");
        else form.removeAttribute("data-sz-capture-busy");
        form.querySelectorAll("button[type='submit']").forEach(function(button){
          button.disabled = !!busy;
          button.setAttribute("aria-disabled", busy ? "true" : "false");
        });
      }

      function isEnabled(kind) {
        return kind === "newsletter" ? !!config.newsletterCaptureEnabled : !!config.contactCaptureEnabled;
      }

      function disabledMessage(kind) {
        if (config.mode === "disabled") {
          return "Lead capture works when this site is published on Sitezy.";
        }
        return kind === "newsletter"
          ? "Newsletter signup is not enabled for this page."
          : "This form is not accepting submissions right now.";
      }

      function successMessage(kind) {
        return kind === "newsletter"
          ? "You’re subscribed. Thanks for joining."
          : "Your message is in. We’ll be in touch soon.";
      }

      function errorMessage(error) {
        var text = error && typeof error.message === "string" ? error.message.trim() : "";
        return text || "We couldn’t submit the form just now. Please try again.";
      }

      function collectFields(form) {
        var data = {};
        var formData = new FormData(form);
        formData.forEach(function(value, key){
          if (typeof value !== "string") return;
          var input = form.querySelector('[name="' + key.replace(/"/g, '\\\\"') + '"]');
          if (input && input.hasAttribute("data-sz-capture-honeypot")) return;
          data[key] = value;
        });
        return data;
      }

      async function handleSubmit(event) {
        var form = event.currentTarget;
        if (!form || !form.getAttribute) return;
        var kind = form.getAttribute("data-sz-capture-kind") === "newsletter" ? "newsletter" : "contact";
        event.preventDefault();

        if (!isEnabled(kind)) {
          setFeedback(form, "error", disabledMessage(kind));
          return;
        }

        var honeypot = "";
        var honeypotField = form.querySelector("[data-sz-capture-honeypot]");
        if (honeypotField && typeof honeypotField.value === "string") {
          honeypot = honeypotField.value;
        }

        var payload = {
          kind: kind,
          projectId: config.mode === "preview" ? config.projectId : undefined,
          pagePath: window.location.pathname || "/",
          formId: form.getAttribute("data-sz-capture-form-id") || undefined,
          fields: collectFields(form),
          honeypot: honeypot,
        };

        setBusy(form, true);
        setFeedback(form, "pending", kind === "newsletter" ? "Joining..." : "Sending...");

        try {
          var analytics = window.__sitezyAnalytics || null;
          var response = await fetch(config.submitEndpoint || "/api/leads/submit", {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              "X-Sitezy-Session-Id": analytics && analytics.sessionId ? String(analytics.sessionId) : "",
              "X-Sitezy-Visitor-Id": analytics && analytics.visitorId ? String(analytics.visitorId) : "",
            },
            body: JSON.stringify(payload),
          });
          var data = await response.json().catch(function(){ return {}; });
          if (!response.ok) {
            throw new Error(typeof data.error === "string" ? data.error : "");
          }

          form.reset();
          setFeedback(form, "success", successMessage(kind));
        } catch (error) {
          setFeedback(form, "error", errorMessage(error));
        } finally {
          setBusy(form, false);
        }
      }

      function bind() {
        decorateGeneratedForms();
        forms().forEach(function(form){
          if (form.getAttribute("data-sz-capture-bound") === "1") return;
          form.setAttribute("data-sz-capture-bound", "1");
          setFeedback(form, "idle", "");
          form.addEventListener("submit", handleSubmit);
        });
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bind, { once: true });
      } else {
        bind();
      }
    })();
  <\/script>`;
}
