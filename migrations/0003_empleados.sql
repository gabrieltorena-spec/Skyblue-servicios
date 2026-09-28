-- Skyblue Servicios · el personal
--
-- Claves de arranque: gabriel 1519 · maria 1111 · rafaela 2222 · anthony 3333 · german 4444
-- CAMBIARLAS apenas la app esté en uso:
--   node herramientas/claves.js maria:8421
-- y pegar el SQL que imprime en la consola de D1.
--
-- Lo que se guarda es sha-256 de (sal + clave). La clave en sí no está acá.

INSERT INTO empleados (id, usuario, nombre, rol, pin_hash, pin_salt, creado_en) VALUES
 ('aea5d050-2ad0-4515-98e4-4447cc564650','gabriel','Gabriel','admin',
  'a2f479ceff34243f732f8002f3a21affde26a96653b026000092c71ce4d8a7cb','450d11d84be8a4a8c36b09f7bb767aec',datetime('now')),
 ('77fd39d3-6e14-40a3-9a95-276e7875e5c3','maria','María','mucama',
  'bbbc85fb56bf3afcb662848e3de630d49071fc03cf6afb7ea9759479d28d6bf5','70509c5bd24e18a5cc10ac52a92c4233',datetime('now')),
 ('386b0f4f-656d-41c1-912c-00d8b557bc33','rafaela','Rafaela','mucama',
  'c46ec1d978a0e2f537f27caee1b037023510ec842d11e68186d74759b539b8eb','389513c957eb0477b60efcfd50fe7b99',datetime('now')),
 ('4b2ba1df-3473-4eb0-96e3-5f1aa669a589','anthony','Anthony','mucama',
  'a1464b083c27e58a883489ab216c98b28b018925ffd4d657bb083c9d51a78c06','d8a591d7c1e698dfc821d48627e69dce',datetime('now')),
 ('38e79d23-ab7d-4516-b97f-05e2a941e5ae','german','German','mantenimiento',
  '143868cafca1686a8054563d94edbb6f9c22c5b01b81e4384785ea17b7084a7c','a7b91d43cdbc10969af2926feda0104d',datetime('now'));
