// Sınıf Atlatma modülü.
// Eskiden class-promotion.html sayfasında bağımsız çalışan mantık, artık
// ayarlar sayfasındaki modalın içine monte edilecek şekilde küçük bir modüle
// taşındı. Tüm ID'ler "cp-" önekiyle scoped tutulur ki sayfa ID'leriyle
// çakışmasın. Tek kullanım: classPromotionAc(rootEl).

import { tumOgrencileriGetir, veriCacheleriniTemizle } from "./students.js?v=20260605-91";
import { db } from "./firebase-config.js?v=20260605-91";
import {
  collection, getDocs, doc, writeBatch, query, where
} from "./firebase-imports.js?v=20260605-91";
import { toast, onayIste, sinifParcala, compareSinif, escapeHtml, escapeAttr, bugun } from "./utils.js?v=20260605-91";

const BAGLI_KOLEKSIYONLAR = ["veliler", "devamsizliklar", "davranislar", "veligorusmeleri"];

const ISKELET_HTML = `
  <div class="alert alert-warning d-flex align-items-start gap-2 mb-3">
    <i class="bi bi-exclamation-triangle-fill fs-5"></i>
    <div>
      <strong>Dikkat!</strong> Bu işlem öğrencileri <strong>sınıf düzeyi bazında</strong> bir üst sınıfa taşır.
      9→10, 10→11, 11→12 geçişi otomatik hesaplanır.
      12. sınıf öğrencileri M serisi yeni ID ile <strong>Mezun</strong> olarak etiketlenir.
    </div>
  </div>

  <div id="cp-yukleniyor" class="text-center py-4 text-muted">
    <div class="spinner-border text-primary mb-2"></div><div>Hazırlanıyor...</div>
  </div>

  <div id="cp-icerik" class="d-none">
    <div class="card mb-3">
      <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h6 class="mb-0"><i class="bi bi-arrow-up-circle me-1"></i>Sınıf Düzeyi Aktarım Tablosu</h6>
        <div class="d-flex gap-2">
          <button id="cp-toplu-otomatik-btn" class="btn btn-sm btn-outline-primary" type="button">
            <i class="bi bi-magic me-1"></i>Otomatik Seç
          </button>
          <button id="cp-onayla-btn" class="btn btn-sm btn-danger" type="button">
            <i class="bi bi-check-circle me-1"></i>Aktarımı Uygula
          </button>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-sm mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>Sınıf Grubu</th>
                <th>Şubeler</th>
                <th>Öğrenci Sayısı</th>
                <th>Geçiş Sonucu</th>
                <th>Bu Grup İçin İşlem</th>
              </tr>
            </thead>
            <tbody id="cp-aktarim-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="cp-sonuc-kap" class="d-none">
      <div class="alert alert-success" id="cp-sonuc-mesaj"></div>
    </div>
  </div>
`;

/**
 * Sınıf Atlatma modülünü verilen kapsayıcı elemana monte eder.
 * Her açılışta DOM ve state baştan kurulur, böylece tekrar tekrar
 * açılıp kapanmak güvenlidir.
 */
export async function classPromotionAc(root) {
  if (!root) throw new Error("classPromotionAc: kök eleman gerekli");
  root.innerHTML = ISKELET_HTML;
  const $ = (sel) => root.querySelector(sel);

  let ogrenciler = [];
  let sinifGruplari = [];
  let sonGeriAlma = null;
  const grupIslemleri = {};

  await yukle();
  baglayici();

  async function yukle() {
    try {
      ogrenciler = await tumOgrencileriGetir();
      tabloGoster();
      $("#cp-yukleniyor").classList.add("d-none");
      $("#cp-icerik").classList.remove("d-none");
    } catch (err) {
      $("#cp-yukleniyor").innerHTML =
        `<div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Veriler yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.
          <div class="small text-muted mt-1">${escapeHtml(err.message)}</div>
        </div>`;
    }
  }

  function sinifHesapla(sinif) {
    const raw = String(sinif || "").trim();
    if (!raw) return null;
    const parca = sinifParcala(raw);
    if (!Number.isFinite(parca.seviye)) return null;
    if (parca.seviye < 12) {
      return raw.replace(/\d{1,2}/, String(parca.seviye + 1));
    }
    return "MEZUN";
  }

  function tabloGoster() {
    sinifGruplari = sinifGruplariniHazirla();
    const tbody = $("#cp-aktarim-tbody");
    tbody.innerHTML = sinifGruplari.length
      ? sinifGruplari.map(grup => {
          const mevcut = grupIslemleri[grup.key] || grupVarsayilanIslem(grup);
          const siniflar = [...grup.siniflar].sort(compareSinif);
          return `<tr id="cp-grup-${escapeAttr(grup.key)}">
            <td>
              <div class="fw-semibold">${escapeHtml(grupBasligi(grup))}</div>
              <div class="small text-muted">${escapeHtml(islemEtiketi(grupVarsayilanIslem(grup)))}</div>
            </td>
            <td>
              <div class="d-flex flex-wrap gap-1">
                ${siniflar.map(sinif => `<span class="badge bg-secondary">${escapeHtml(sinif || "—")}</span>`).join("")}
              </div>
            </td>
            <td>
              <span class="fw-semibold">${grup.ogrenciler.length}</span>
              <span class="text-muted small">öğrenci</span>
            </td>
            <td>${grupSonucEtiketi(grup)}</td>
            <td>
              <select class="form-select form-select-sm cp-sinif-islem-select"
                      data-grup-key="${escapeAttr(grup.key)}">
                ${grupSecenekleri(grup, mevcut)}
              </select>
            </td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" class="text-center text-muted py-3">Aktif öğrenci bulunamadı.</td></tr>`;
  }

  function sinifGruplariniHazirla() {
    const gruplar = new Map();
    ogrenciler.forEach(ogrenci => {
      const seviye = sinifSeviyesi(ogrenci.sinif);
      const key = seviye >= 9 && seviye <= 12 ? `seviye-${seviye}` : "diger";
      if (!gruplar.has(key)) {
        gruplar.set(key, {
          key,
          seviye: seviye >= 9 && seviye <= 12 ? seviye : null,
          siniflar: new Set(),
          ogrenciler: []
        });
      }
      const grup = gruplar.get(key);
      grup.siniflar.add(ogrenci.sinif || "—");
      grup.ogrenciler.push(ogrenci);
    });
    return [...gruplar.values()].sort((a, b) => (a.seviye ?? 99) - (b.seviye ?? 99));
  }

  function sinifSeviyesi(sinif) {
    const parca = sinifParcala(sinif);
    return Number.isFinite(parca.seviye) ? parca.seviye : null;
  }

  function grupBasligi(grup) {
    return grup.seviye ? `${grup.seviye}. Sınıflar` : "Diğer / Sınıfı Okunamayan";
  }

  function grupVarsayilanIslem(grup) {
    if (!grup.seviye) return "kalir";
    return grup.seviye >= 12 ? "mezun" : "gecis";
  }

  function grupSecenekleri(grup, mevcut) {
    const hedefSeviye = grup.seviye ? grup.seviye + 1 : null;
    const gecisSecenegi = grup.seviye && grup.seviye < 12
      ? `<option value="gecis" ${mevcut === "gecis" ? "selected" : ""}>${grup.seviye}. sınıftan ${hedefSeviye}. sınıfa geçir</option>`
      : "";
    const mezunSecenegi = grup.seviye === 12
      ? `<option value="mezun" ${mevcut === "mezun" ? "selected" : ""}>Mezun Et (M serisi ID)</option>`
      : "";
    return `${gecisSecenegi}${mezunSecenegi}
      <option value="kalir" ${mevcut === "kalir" ? "selected" : ""}>Aynı sınıfta bırak</option>
      <option value="sil" ${mevcut === "sil" ? "selected" : ""}>Sil (Nakil / Ayrıldı)</option>`;
  }

  function grupSonucEtiketi(grup) {
    if (grup.seviye === 12) return `<span class="badge bg-success">Mezun olacak</span>`;
    if (grup.seviye) return `<span class="badge bg-primary">${grup.seviye}. sınıflar → ${grup.seviye + 1}. sınıflar</span>`;
    return `<span class="badge bg-warning text-dark">Elle kontrol</span>`;
  }

  function islemEtiketi(islem) {
    switch (islem) {
      case "gecis": return "Bir üst sınıfa geçer";
      case "mezun": return "Mezun edilir";
      case "kalir": return "Aynı sınıfta kalır";
      case "sil": return "Silinir";
      default: return "İşlem yok";
    }
  }

  function ogrenciIslemi(ogrenci) {
    const key = grupAnahtari(ogrenci);
    const grup = sinifGruplari.find(g => g.key === key);
    return grupIslemleri[key] || grupVarsayilanIslem(grup || { seviye: null });
  }

  function grupAnahtari(ogrenci) {
    const seviye = sinifSeviyesi(ogrenci.sinif);
    return seviye >= 9 && seviye <= 12 ? `seviye-${seviye}` : "diger";
  }

  function grupIslemleriniTemizle() {
    Object.keys(grupIslemleri).forEach(key => delete grupIslemleri[key]);
  }

  function grupOzeti() {
    return sinifGruplari.map(grup => {
      const islem = grupIslemleri[grup.key] || grupVarsayilanIslem(grup);
      const hedef = grup.seviye && islem === "gecis" ? ` (${grup.seviye}. → ${grup.seviye + 1}. sınıf)` : "";
      return `• ${grupBasligi(grup)}: ${islemEtiketi(islem)}${hedef} — ${grup.ogrenciler.length} öğrenci`;
    }).join("\n");
  }

  function islemSec(grupKey, islem) {
    grupIslemleri[grupKey] = islem;
  }

  function baglayici() {
    $("#cp-aktarim-tbody").addEventListener("change", (e) => {
      const select = e.target.closest(".cp-sinif-islem-select[data-grup-key]");
      if (!select) return;
      islemSec(select.dataset.grupKey, select.value);
    });

    $("#cp-toplu-otomatik-btn").addEventListener("click", () => {
      sinifGruplari.forEach(grup => {
        grupIslemleri[grup.key] = grupVarsayilanIslem(grup);
      });
      tabloGoster();
      toast("Tüm sınıf düzeyleri için otomatik seçim yapıldı.", "info");
    });

    $("#cp-onayla-btn").addEventListener("click", onaylaTiklandi);
  }

  async function onaylaTiklandi() {
    const onaylaBtn = $("#cp-onayla-btn");
    const onaylaBtnOrijinal = onaylaBtn.innerHTML;

    const silinecekler = ogrenciler.filter(o => ogrenciIslemi(o) === "sil");
    const mezunlar = ogrenciler.filter(o => ogrenciIslemi(o) === "mezun");

    let ozet = "";
    let onayMetni = "AKTAR";
    let onayButonu = "Aktarımı Uygula";

    if (silinecekler.length > 0) {
      onaylaBtn.disabled = true;
      onaylaBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Kayıtlar hesaplanıyor...`;

      try {
        let toplamVeli = 0, toplamDevamsizlik = 0, toplamDavranis = 0, toplamGorusme = 0;
        const ogrenciOzetleri = [];
        for (const o of silinecekler) {
          for (const kol of BAGLI_KOLEKSIYONLAR) {
            const snap = await getDocs(query(collection(db, kol), where("ogrenciId", "==", o.id)));
            if (kol === "veliler")           toplamVeli += snap.size;
            else if (kol === "devamsizliklar") toplamDevamsizlik += snap.size;
            else if (kol === "davranislar")   toplamDavranis += snap.size;
            else if (kol === "veligorusmeleri") toplamGorusme += snap.size;
          }
          ogrenciOzetleri.push(`• ${o.ad} ${o.soyad} (${o.sinif})`);
        }

        ozet = `⚠️ BU İŞLEM GERİ ALINAMAZ. Devam etmeden önce yedek almanız önerilir.\n\n` +
               `Sınıf düzeyi seçimleri:\n${grupOzeti()}\n\n` +
               `Kalıcı olarak silinecekler:\n` +
               `• ${silinecekler.length} öğrenci\n` +
               `• ${toplamVeli} veli kaydı\n` +
               `• ${toplamDevamsizlik} devamsızlık kaydı\n` +
               `• ${toplamDavranis} davranış kaydı\n` +
               `• ${toplamGorusme} veli görüşmesi\n\n` +
               (ogrenciOzetleri.length <= 10
                 ? ogrenciOzetleri.join("\n")
                 : ogrenciOzetleri.slice(0, 10).join("\n") + `\n... ve ${ogrenciOzetleri.length - 10} öğrenci daha`);

        onayMetni = "SINIF ATLAT VE SİL";
        onayButonu = "Uygula (Geri Alınamaz)";
      } catch (err) {
        toast("Kayıt sayısı hesaplanamadı: " + err.message, "danger");
        onaylaBtn.disabled = false;
        onaylaBtn.innerHTML = onaylaBtnOrijinal;
        return;
      } finally {
        onaylaBtn.disabled = false;
        onaylaBtn.innerHTML = onaylaBtnOrijinal;
      }
    } else {
      ozet = `Silinecek öğrenci yok. Sınıf geçişleri, mezuniyet ID taşıma işlemleri ve aynı sınıfta kalanlar işlenecek.\n\n` +
             `Sınıf düzeyi seçimleri:\n${grupOzeti()}\n\n` +
             `Mezun edilecek öğrenci: ${mezunlar.length}`;
      onayMetni = "AKTAR";
      onayButonu = "Aktarımı Uygula";
    }

    const onay = await onayIste({
      baslik: "Sınıf atlatmayı uygula",
      mesaj: silinecekler.length > 0
        ? `${silinecekler.length} öğrenci ve tüm bağlı kayıtları kalıcı olarak silinecek.`
        : "Seçili sınıf geçişleri ve mezuniyet etiketleri uygulanacak.",
      detay: ozet,
      onayMetni,
      onayButonu,
      tip: silinecekler.length > 0 ? "danger" : "warning"
    });
    if (!onay) return;
    onaylaBtn.disabled = true;
    onaylaBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>İşleniyor...`;

    let basarili = 0, mezun = 0, kalir = 0, silindi = 0, hatali = 0;
    const hataMesajlari = [];
    const geriAlmaIslemleri = [];
    const geriAlmaDestekli = silinecekler.length === 0;
    let mezunIdPlani = new Map();
    try {
      mezunIdPlani = await mezunIdPlaniHazirla(mezunlar);
    } catch (err) {
      onaylaBtn.disabled = false;
      onaylaBtn.innerHTML = onaylaBtnOrijinal;
      toast("Mezun ID planı hazırlanamadı: " + err.message, "danger");
      return;
    }
    let batch = writeBatch(db);
    let yazmaSayisi = 0;

    async function yaz(apply) {
      if (yazmaSayisi >= 450) await batchiGonder();
      apply(batch);
      yazmaSayisi++;
    }
    async function batchiGonder() {
      if (yazmaSayisi === 0) return;
      await batch.commit();
      batch = writeBatch(db);
      yazmaSayisi = 0;
    }

    for (const o of ogrenciler) {
      const islem = ogrenciIslemi(o);
      try {
        if (islem === "gecis") {
          const yeni = sinifHesapla(o.sinif);
          if (!yeni || yeni === "MEZUN") throw new Error("Sınıf hesaplanamadı");
          await yaz(b => b.update(doc(db, "students", o.id), { sinif: yeni, durum: "Aktif", guncelleme_tarihi: bugun() }));
          if (geriAlmaDestekli) {
            geriAlmaIslemleri.push({ tur: "gecis", id: o.id, sinif: o.sinif || "", durum: o.durum || "Aktif" });
          }
          basarili++;
        } else if (islem === "mezun") {
          const mezunId = mezunIdPlani.get(o.id);
          await ogrenciyiMezunEt(o, mezunId, yaz);
          if (geriAlmaDestekli) {
            geriAlmaIslemleri.push({ tur: "mezun", eskiId: o.id, yeniId: mezunId, ogrenci: { ...o } });
          }
          mezun++;
        } else if (islem === "kalir") {
          kalir++;
        } else if (islem === "sil") {
          await ogrenciyiSistemdenCikar(o.id, yaz);
          silindi++;
        }
      } catch (err) {
        hatali++;
        hataMesajlari.push(`${o.id}: ${err.message}`);
      }
    }

    try {
      await batchiGonder();
    } catch (err) {
      hatali++;
      hataMesajlari.push(`Toplu yazma: ${err.message}`);
    }

    sonGeriAlma = geriAlmaDestekli && hatali === 0 && geriAlmaIslemleri.length
      ? { islemler: geriAlmaIslemleri, zaman: Date.now() }
      : null;
    const geriAlButonu = sonGeriAlma
      ? `<div class="mt-3">
           <button type="button" class="btn btn-sm btn-outline-dark" id="cp-geri-al-btn">
             <i class="bi bi-arrow-counterclockwise me-1"></i>Son işlemi geri al
           </button>
           <span class="small text-muted ms-2">Bu seçenek modal kapanana kadar kullanılabilir.</span>
         </div>`
      : "";

    $("#cp-sonuc-kap").classList.remove("d-none");
    $("#cp-sonuc-mesaj").innerHTML =
      `Aktarım tamamlandı: <strong>${basarili}</strong> öğrenci bir üst sınıfa geçirildi,
       <strong>${mezun}</strong> öğrenci M serisi ID ile Mezun olarak etiketlendi,
       <strong>${kalir}</strong> öğrenci aynı sınıfta bırakıldı,
       <strong>${silindi}</strong> öğrenci silindi${hatali ? `, <strong>${hatali}</strong> işlem hata verdi` : ""}.
       ${hataMesajlari.length ? `<div class="small mt-2">${escapeHtml(hataMesajlari.slice(0, 5).join(" | "))}</div>` : ""}
       ${silindi ? `<div class="small mt-2 text-muted">Silme içeren aktarımlar geri alınamaz.</div>` : ""}
       ${geriAlButonu}`;
    $("#cp-geri-al-btn")?.addEventListener("click", geriAlmaUygula);

    onaylaBtn.disabled = false;
    onaylaBtn.innerHTML = `<i class="bi bi-check-circle me-1"></i>Aktarımı Uygula`;

    toast("Sınıf atlatma tamamlandı.", "success");
    veriCacheleriniTemizle();
    grupIslemleriniTemizle();
    await yukle();
  }

  async function mezunIdPlaniHazirla(mezunlar) {
    const plan = new Map();
    if (!mezunlar.length) return plan;

    const snap = await getDocs(collection(db, "students"));
    const kullanilanIdler = new Set(snap.docs.map(d => d.id));
    let sonNo = 0;

    kullanilanIdler.forEach(id => {
      const eslesen = String(id).match(/^M(\d+)$/i);
      if (eslesen) sonNo = Math.max(sonNo, Number(eslesen[1]));
    });

    for (const ogrenci of mezunlar) {
      let yeniId = "";
      do {
        sonNo++;
        yeniId = `M${String(sonNo).padStart(4, "0")}`;
      } while (kullanilanIdler.has(yeniId));
      kullanilanIdler.add(yeniId);
      plan.set(ogrenci.id, yeniId);
    }

    return plan;
  }

  async function geriAlmaUygula() {
    if (!sonGeriAlma?.islemler?.length) {
      toast("Geri alınacak işlem bulunamadı.", "warning");
      return;
    }

    const onay = await onayIste({
      baslik: "Son sınıf atlatmayı geri al",
      mesaj: "Sınıf geçişleri ve mezuniyet ID taşıma işlemleri eski haline döndürülecek.",
      detay: `${sonGeriAlma.islemler.length} işlem geri alınacak. Silme içeren aktarımlar bu kapsamda değildir.`,
      onayMetni: "GERİ AL",
      onayButonu: "Geri Al",
      tip: "warning"
    });
    if (!onay) return;

    const btn = $("#cp-geri-al-btn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Geri alınıyor...`;
    }

    let batch = writeBatch(db);
    let yazmaSayisi = 0;
    async function yaz(apply) {
      if (yazmaSayisi >= 450) await batchiGonder();
      apply(batch);
      yazmaSayisi++;
    }
    async function batchiGonder() {
      if (yazmaSayisi === 0) return;
      await batch.commit();
      batch = writeBatch(db);
      yazmaSayisi = 0;
    }

    try {
      for (const islem of [...sonGeriAlma.islemler].reverse()) {
        if (islem.tur === "gecis") {
          await yaz(b => b.update(doc(db, "students", islem.id), {
            sinif: islem.sinif,
            durum: islem.durum || "Aktif",
            guncelleme_tarihi: bugun()
          }));
        } else if (islem.tur === "mezun") {
          const { id: _id, ...ogrenciVerisi } = islem.ogrenci;
          await yaz(b => b.set(doc(db, "students", islem.eskiId), {
            ...ogrenciVerisi,
            guncelleme_tarihi: bugun()
          }));
          for (const koleksiyon of BAGLI_KOLEKSIYONLAR) {
            const snap = await getDocs(query(collection(db, koleksiyon), where("ogrenciId", "==", islem.yeniId)));
            for (const d of snap.docs) {
              await yaz(b => b.update(d.ref, { ogrenciId: islem.eskiId, guncelleme_tarihi: bugun() }));
            }
          }
          await yaz(b => b.delete(doc(db, "students", islem.yeniId)));
        }
      }
      await batchiGonder();
      sonGeriAlma = null;
      veriCacheleriniTemizle();
      grupIslemleriniTemizle();
      toast("Son sınıf atlatma işlemi geri alındı.", "success");
      $("#cp-sonuc-kap").classList.remove("d-none");
      $("#cp-sonuc-mesaj").innerHTML =
        `<strong>Geri alma tamamlandı.</strong> Öğrenciler önceki sınıf/mezuniyet durumuna döndürüldü.`;
      await yukle();
    } catch (err) {
      toast("Geri alma tamamlanamadı: " + err.message, "danger");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-arrow-counterclockwise me-1"></i>Son işlemi geri al`;
      }
    }
  }

  async function ogrenciyiMezunEt(ogrenci, mezunId, yaz) {
    if (!mezunId) throw new Error("Mezun ID oluşturulamadı");
    const eskiId = String(ogrenci.id);
    const { id: _id, ...ogrenciVerisi } = ogrenci;
    const mezunVerisi = {
      ...ogrenciVerisi,
      numara: String(ogrenci.numara || eskiId),
      durum: "Mezun",
      guncelleme_tarihi: bugun()
    };

    await yaz(b => b.set(doc(db, "students", mezunId), mezunVerisi));
    for (const koleksiyon of BAGLI_KOLEKSIYONLAR) {
      const snap = await getDocs(query(collection(db, koleksiyon), where("ogrenciId", "==", eskiId)));
      for (const d of snap.docs) {
        await yaz(b => b.update(d.ref, { ogrenciId: mezunId, guncelleme_tarihi: bugun() }));
      }
    }
    await yaz(b => b.delete(doc(db, "students", eskiId)));
  }

  async function ogrenciyiSistemdenCikar(ogrenciId, yaz) {
    for (const koleksiyon of BAGLI_KOLEKSIYONLAR) {
      const snap = await getDocs(query(collection(db, koleksiyon), where("ogrenciId", "==", ogrenciId)));
      for (const d of snap.docs) {
        await yaz(b => b.delete(d.ref));
      }
    }
    await yaz(b => b.delete(doc(db, "students", ogrenciId)));
  }
}
