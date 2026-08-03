export interface CmsRuntimeEntry {
  id: string;
  title: string;
  slug: string;
  values: Record<string, string>;
}

export interface CmsRuntimeConfig {
  mode: "listing" | "detail";
  collectionId: string;
  collectionSlug: string;
  publicBasePath: string;
  detailPathTemplate: string | null;
  fieldMapping: Record<string, string>;
  itemLimit: number | null;
  entries: CmsRuntimeEntry[];
  detailEntry: CmsRuntimeEntry | null;
}

function serializeConfig(config: CmsRuntimeConfig) {
  return JSON.stringify(config).replace(/</g, "\\u003c");
}

export function buildCmsRuntimeScript(config?: CmsRuntimeConfig | null) {
  if (!config) return "";
  const serialized = serializeConfig(config);

  return `<script>
    (function(){
      var config = ${serialized};
      if(!config) return;

      function sourceValue(entry, sourceKey){
        if(!entry) return "";
        if(sourceKey === "title") return entry.title || "";
        if(sourceKey === "slug") return entry.slug || "";
        if(sourceKey === "url"){
          return config.detailPathTemplate
            ? config.detailPathTemplate.replace(":slug", entry.slug || "")
            : entry.values.url || "";
        }
        return entry.values && entry.values[sourceKey] ? String(entry.values[sourceKey]) : "";
      }

      function fieldValue(entry, fieldKey){
        var mapped = config.fieldMapping && config.fieldMapping[fieldKey] ? config.fieldMapping[fieldKey] : fieldKey;
        return sourceValue(entry, mapped);
      }

      function collectionRoots(){
        var exact = Array.from(document.querySelectorAll('[data-sz-collection-source="cms"][data-sz-collection-cms-collection-id="' + config.collectionId + '"]'));
        if(exact.length) return exact;
        var generic = Array.from(document.querySelectorAll('[data-sz-collection-source="cms"]'));
        if(generic.length) return generic;
        return Array.from(document.querySelectorAll('[data-sz-collection-kind]:not([data-sz-collection-fixed="1"])')).slice(0, 1);
      }

      function replaceNodeContent(node, value){
        if(!node) return;
        var nextValue = value == null ? "" : String(value);
        var tag = String(node.tagName || "").toLowerCase();
        if(tag === "img"){
          node.setAttribute("src", nextValue);
          if(!node.getAttribute("alt")) node.setAttribute("alt", nextValue ? "CMS image" : "");
          return;
        }
        if(tag === "a" && (node.getAttribute("data-sz-field") === "url" || /^https?:/.test(nextValue) || nextValue.startsWith("/"))){
          node.setAttribute("href", nextValue || "#");
        }
        if(node.querySelector && node.querySelector("img") && /^https?:/.test(nextValue)){
          var img = node.querySelector("img");
          if(img) img.setAttribute("src", nextValue);
        }
        if(node.children && node.children.length && !node.hasAttribute("data-sz-field")){
          node.textContent = nextValue;
          return;
        }
        node.textContent = nextValue;
      }

      function applyFields(scope, entry){
        if(!scope || !scope.querySelectorAll) return;
        scope.querySelectorAll("[data-sz-field]").forEach(function(node){
          var key = node.getAttribute("data-sz-field") || "";
          replaceNodeContent(node, fieldValue(entry, key));
        });
      }

      function renderListing(){
        var roots = collectionRoots();
        var entries = Array.isArray(config.entries) ? config.entries.slice(0, config.itemLimit || config.entries.length) : [];
        roots.forEach(function(root){
          var container = root.querySelector('[data-sz-collection-items="1"]') || root;
          var template = container.querySelector('[data-sz-item="1"]') || container.firstElementChild;
          if(!template) return;
          var clones = [];
          entries.forEach(function(entry){
            var clone = template.cloneNode(true);
            if(clone.setAttribute){
              clone.setAttribute("data-sz-item", "1");
              clone.setAttribute("data-sz-item-key", entry.id || entry.slug);
            }
            applyFields(clone, entry);
            if(clone.querySelectorAll){
              clone.querySelectorAll("a").forEach(function(anchor){
                if(!config.detailPathTemplate) return;
                var href = anchor.getAttribute("href") || "";
                if(!href || href === "#" || href === "/"){
                  anchor.setAttribute("href", config.detailPathTemplate.replace(":slug", entry.slug || ""));
                }
              });
            }
            clones.push(clone);
          });
          container.innerHTML = "";
          clones.forEach(function(clone){ container.appendChild(clone); });
        });
      }

      function renderDetail(){
        var entry = config.detailEntry || (Array.isArray(config.entries) ? config.entries[0] : null);
        if(!entry) return;
        applyFields(document.body, entry);
        document.querySelectorAll("a[data-sz-field='url']").forEach(function(anchor){
          anchor.setAttribute("href", fieldValue(entry, "url") || "#");
        });
      }

      if(config.mode === "detail") renderDetail();
      else renderListing();
    })();
  <\/script>`;
}
