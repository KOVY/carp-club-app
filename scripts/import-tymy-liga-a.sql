-- ============================================
-- IMPORT TÝMŮ - LIGA A (20 týmů)
-- ============================================
-- INSTRUKCE:
-- 1. Nahraď 'ZAVOD_ID_LIGA_A' skutečným ID závodu z tabulky zavody
-- 2. Spusť v Supabase SQL Editor
-- ============================================

-- Proměnná pro ID závodu (nahraď skutečným UUID)
-- Příklad: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

DO $$
DECLARE
  v_zavod_id UUID := '65f38c5c-7f4b-4ff3-a2db-4fdf8b91261e'; -- Liga A 2026 - 0. kolo
  v_team_id UUID;
BEGIN
  -- Tým 1: Kolář
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Kolář', 'kolar', '#2563eb', 1)
  RETURNING id INTO v_team_id;

  -- Tým 2: Humpál Roth Vachta
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Humpál Roth Vachta', 'humpal-roth-vachta', '#dc2626', 2);

  -- Tým 3: Toman Boucník Konštant Toman
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Toman Boucník Konštant Toman', 'toman-boucnik-konstant-toman', '#16a34a', 3);

  -- Tým 4: Poláček Zelený
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Poláček Zelený', 'polacek-zeleny', '#ca8a04', 4);

  -- Tým 5: Polák Palkovič Tóth
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Polák Palkovič Tóth', 'polak-palkovic-toth', '#9333ea', 5);

  -- Tým 6: Vostrejš Bartoň Adámek
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Vostrejš Bartoň Adámek', 'vostrejs-barton-adamek', '#ea580c', 6);

  -- Tým 7: Kazda Jech Hanuš Kuca
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Kazda Jech Hanuš Kuca', 'kazda-jech-hanus-kuca', '#0891b2', 7);

  -- Tým 8: Koudelka Stránský Kukla
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Koudelka Stránský Kukla', 'koudelka-stransky-kukla', '#be185d', 8);

  -- Tým 9: Podoubský Buneš
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Podoubský Buneš', 'podoubsky-bunes', '#65a30d', 9);

  -- Tým 10: Vorčák Vinklárek Nosek
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Vorčák Vinklárek Nosek', 'vorcak-vinkliarek-nosek', '#7c3aed', 10);

  -- Tým 11: Holuša Tvrdoň Kovalčík
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Holuša Tvrdoň Kovalčík', 'holusa-tvrdon-kovalcik', '#2563eb', 11);

  -- Tým 12: Kučera Sembdner Suchánek
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Kučera Sembdner Suchánek', 'kucera-sembdner-suchanek', '#dc2626', 12);

  -- Tým 13: Drmola Drmola Pečiva
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Drmola Drmola Pečiva', 'drmola-drmola-peciva', '#16a34a', 13);

  -- Tým 14: Štveráček Voves Večeřa
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Štveráček Voves Večeřa', 'stveracek-voves-vecera', '#ca8a04', 14);

  -- Tým 15: Mišovic Daru Švejda
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Mišovic Daru Švejda', 'misovic-daru-svejda', '#9333ea', 15);

  -- Tým 16: Huss Horníček
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Huss Horníček', 'huss-hornicek', '#ea580c', 16);

  -- Tým 17: Doležel Cila
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Doležel Cila', 'dolezel-cila', '#0891b2', 17);

  -- Tým 18: Felice Fabbri Zítek
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Felice Fabbri Zítek', 'felice-fabbri-zitek', '#be185d', 18);

  -- Tým 19: Šafář Oškera Broulík
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Šafář Oškera Broulík', 'safar-oskera-broulik', '#65a30d', 19);

  -- Tým 20: Pudil Šamšula Halva Skořepa
  INSERT INTO tymy (zavod_id, nazev, slug, barva, peg_cislo)
  VALUES (v_zavod_id, 'Pudil Šamšula Halva Skořepa', 'pudil-samssula-halva-skorepa', '#7c3aed', 20);

  RAISE NOTICE 'Liga A: Úspěšně vytvořeno 20 týmů pro závod %', v_zavod_id;
END $$;
