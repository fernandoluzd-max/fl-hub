//! Pastas de predefinição do CapCut (CombinationPresetVirtualStore.json).
//! Bloco type 0: entradas (type 0 = pasta, type 1 = predefinição). Bloco type 1: relações filho -> pai.
//! Regras: nunca apagar nada do aluno; reaproveitar pasta com o mesmo nome no mesmo lugar;
//! substituir entradas de predefinição do pacote que já existam (sem duplicar).

use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};

pub const FILE: &str = "CombinationPresetVirtualStore.json";

fn blocks(v: &mut Value) -> (Vec<Value>, Vec<Value>) {
    let mut ent = vec![];
    let mut rel = vec![];
    if let Some(arr) = v.get("preset_virtual_store").and_then(|x| x.as_array()) {
        for b in arr {
            let t = b.get("type").and_then(|x| x.as_i64()).unwrap_or(-1);
            let vals = b.get("value").and_then(|x| x.as_array()).cloned().unwrap_or_default();
            if t == 0 {
                ent = vals;
            } else if t == 1 {
                rel = vals;
            }
        }
    }
    (ent, rel)
}

fn build(ent: Vec<Value>, rel: Vec<Value>) -> Value {
    json!({ "preset_virtual_store": [ { "type": 0, "value": ent }, { "type": 1, "value": rel } ] })
}

fn s(v: &Value, k: &str) -> String {
    v.get(k).and_then(|x| x.as_str()).unwrap_or("").to_string()
}
fn t(v: &Value) -> i64 {
    v.get("type").and_then(|x| x.as_i64()).unwrap_or(-1)
}

pub struct MergeResult {
    pub index: Value,
    /// ids de pastas criadas pelo FL Hub (para remover na desinstalação, se ficarem vazias)
    pub created_folders: Vec<String>,
    /// ids das predefinições do pacote registradas no índice
    pub preset_ids: Vec<String>,
}

pub fn merge(existing: Option<Value>, ours: &Value) -> MergeResult {
    let mut theirs = existing.unwrap_or_else(|| build(vec![], vec![]));
    let (mut te, mut tr) = blocks(&mut theirs);
    let mut ours_c = ours.clone();
    let (ne, nr) = blocks(&mut ours_c);

    let npai: HashMap<String, String> = nr.iter().map(|r| (s(r, "child_id"), s(r, "parent_id"))).collect();
    let mut tpai: HashMap<String, String> = tr.iter().map(|r| (s(r, "child_id"), s(r, "parent_id"))).collect();
    let mut map: HashMap<String, String> = HashMap::from([(String::new(), String::new())]);
    let mut created = vec![];

    let mut pendentes: Vec<Value> = ne.iter().filter(|e| t(e) == 0).cloned().collect();
    for _ in 0..32 {
        if pendentes.is_empty() {
            break;
        }
        let mut resto = vec![];
        for f in pendentes {
            let fid = s(&f, "id");
            let pp = npai.get(&fid).cloned().unwrap_or_default();
            let Some(pai_local) = map.get(&pp).cloned() else {
                resto.push(f);
                continue;
            };
            let ja = te.iter().find(|e| {
                t(e) == 0 && s(e, "name") == s(&f, "name") && tpai.get(&s(e, "id")).cloned().unwrap_or_default() == pai_local
            });
            if let Some(j) = ja {
                map.insert(fid, s(j, "id"));
            } else {
                te.push(f.clone());
                tr.push(json!({ "child_id": fid, "parent_id": pai_local }));
                tpai.insert(fid.clone(), pai_local);
                map.insert(fid.clone(), fid.clone());
                created.push(fid);
            }
        }
        pendentes = resto;
    }

    let nossos: HashSet<String> = ne.iter().filter(|e| t(e) == 1).map(|e| s(e, "name")).collect();
    let sai: HashSet<String> = te.iter().filter(|e| t(e) == 1 && nossos.contains(&s(e, "name"))).map(|e| s(e, "id")).collect();
    te.retain(|e| !sai.contains(&s(e, "id")));
    tr.retain(|r| !sai.contains(&s(r, "child_id")));

    let mut preset_ids = vec![];
    for e in ne.iter().filter(|e| t(e) == 1) {
        let id = s(e, "id");
        let pai = map.get(&npai.get(&id).cloned().unwrap_or_default()).cloned().unwrap_or_default();
        te.push(e.clone());
        tr.push(json!({ "child_id": id, "parent_id": pai }));
        preset_ids.push(id);
    }
    MergeResult { index: build(te, tr), created_folders: created, preset_ids }
}

/// Remove do índice as predefinições do pacote e as pastas criadas pelo FL Hub que ficarem vazias.
pub fn remove(existing: Value, preset_ids: &[String], created_folders: &[String]) -> Value {
    let mut v = existing;
    let (mut te, mut tr) = blocks(&mut v);
    let ids: HashSet<&String> = preset_ids.iter().collect();
    te.retain(|e| !ids.contains(&s(e, "id")));
    tr.retain(|r| !ids.contains(&s(r, "child_id")));
    // pastas criadas por nós, de dentro para fora, somente se vazias
    loop {
        let filhos: HashSet<String> = tr.iter().map(|r| s(r, "parent_id")).collect();
        let vazias: HashSet<String> =
            created_folders.iter().filter(|f| !filhos.contains(*f) && te.iter().any(|e| s(e, "id") == **f)).cloned().collect();
        if vazias.is_empty() {
            break;
        }
        te.retain(|e| !vazias.contains(&s(e, "id")));
        tr.retain(|r| !vazias.contains(&s(r, "child_id")));
    }
    build(te, tr)
}
