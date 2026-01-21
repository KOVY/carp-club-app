-- ============================================
-- IMPORT TÝMŮ - LIGA B (20 týmů)
-- ============================================
-- INSTRUKCE:
-- 1. Nahraď 'ZAVOD_ID_LIGA_B' skutečným ID závodu z tabulky zavody
-- 2. Spusť v Supabase SQL Editor
-- ============================================

DO $$
DECLARE
  v_zavod_id UUID := 'ZAVOD_ID_LIGA_B'; -- <-- NAHRAĎ TOTO!
BEGIN
  -- Tým 1: Kovacic-Jurman Stopa
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Kovacic-Jurman Stopa', 'kovacic-jurman-stopa', '#2563eb', 1);

  -- Tým 2: Hub Bartušek
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Hub Bartušek', 'hub-bartusek', '#dc2626', 2);

  -- Tým 3: Soukup Zuklín
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Soukup Zuklín', 'soukup-zuklin', '#16a34a', 3);

  -- Tým 4: Hořejší
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Hořejší', 'horejsi', '#ca8a04', 4);

  -- Tým 5: Adámek Zabloudil
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Adámek Zabloudil', 'adamek-zabloudil', '#9333ea', 5);

  -- Tým 6: Pokorný Szebesta Frýbert Poprštein
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Pokorný Szebesta Frýbert Poprštein', 'pokorny-szebesta-frybert-poprststein', '#ea580c', 6);

  -- Tým 7: Mařík Podroužek Dvořáková
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Mařík Podroužek Dvořáková', 'marik-podrouzek-dvorakova', '#0891b2', 7);

  -- Tým 8: Kopejtka Klíma
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Kopejtka Klíma', 'kopejtka-klima', '#be185d', 8);

  -- Tým 9: Suchánek Javůrek
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Suchánek Javůrek', 'suchanek-javurek', '#65a30d', 9);

  -- Tým 10: Mikšovský Kubeček
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Mikšovský Kubeček', 'miksovsky-kubecek', '#7c3aed', 10);

  -- Tým 11: Klíma Baranyai Vystrčil
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Klíma Baranyai Vystrčil', 'klima-baranyai-vystrcil', '#2563eb', 11);

  -- Tým 12: Postupa Postupa Chadima
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Postupa Postupa Chadima', 'postupa-postupa-chadima', '#dc2626', 12);

  -- Tým 13: Mikšovic Kovanič
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Mikšovic Kovanič', 'miksovic-kovanic', '#16a34a', 13);

  -- Tým 14: Kupčík Čech Pokorný
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Kupčík Čech Pokorný', 'kupcik-cech-pokorny', '#ca8a04', 14);

  -- Tým 15: Daňo Daňo Daňo
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Daňo Daňo Daňo', 'dano-dano-dano', '#9333ea', 15);

  -- Tým 16: Krákora Laštovka Nýč
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Krákora Laštovka Nýč', 'krakora-lastovka-nyc', '#ea580c', 16);

  -- Tým 17: Kubový Kubový Vegricht Udržal
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Kubový Kubový Vegricht Udržal', 'kubovy-kubovy-vegricht-udrzal', '#0891b2', 17);

  -- Tým 18: Slekovič Slekovič Málek
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Slekovič Slekovič Málek', 'slekovic-slekovic-malek', '#be185d', 18);

  -- Tým 19: Štork Vala Kadeřábek Vala
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Štork Vala Kadeřábek Vala', 'stork-vala-kaderabek-vala', '#65a30d', 19);

  -- Tým 20: Duchovič Lovász
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Duchovič Lovász', 'duchovic-lovasz', '#7c3aed', 20);

  RAISE NOTICE 'Liga B: Úspěšně vytvořeno 20 týmů pro závod %', v_zavod_id;
END $$;
