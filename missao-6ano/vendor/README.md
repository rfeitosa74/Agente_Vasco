# Bibliotecas embutidas (offline, sem CDN)

Usadas só quando o pai importa um PDF ou pede para ler o texto de uma foto. Carregam sob demanda.

| Pasta | Biblioteca | Versão | Licença |
|---|---|---|---|
| `pdfjs/` | PDF.js (Mozilla) — transforma páginas de PDF em imagens e lê o texto do PDF | 3.11.174 | Apache-2.0 |
| `tesseract/` | Tesseract.js — OCR no navegador (`tesseract.min.js`, `worker.min.js`) | 7.0.0 | Apache-2.0 |
| `tesseract/core/` | tesseract.js-core (WebAssembly; 3 variantes, o navegador escolhe a melhor) | 7.0.0 | Apache-2.0 |
| `tesseract/lang/por.traineddata.gz` | Modelo de português (`@tesseract.js-data/por`, `4.0.0_best_int`) | 1.0.0 | MIT / Apache-2.0 |

Origem: pacotes do npm, sem modificação. Para atualizar: `npm pack <pacote>@<versão>` e copiar os mesmos arquivos.
