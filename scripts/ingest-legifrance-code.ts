import { ingestLegifranceFromSearch } from "../src/lib/legal/legifrance-ingest";

function toTimestamp(date: string) {
  return new Date(date).getTime();
}

async function main() {
  const date = process.argv[2] || new Date().toISOString().slice(0, 10);
  const maxPages = Number(process.argv[3] || 2);

  const payload = {
    fond: "CODE_DATE",
    recherche: {
      champs: [
        {
          typeChamp: "ARTICLE",
          criteres: [
            {
              typeRecherche: "UN_DES_MOTS",
              valeur: "travail",
              operateur: "ET",
            },
          ],
          operateur: "ET",
        },
      ],
      filtres: [
        {
          facette: "NOM_CODE",
          valeurs: ["Code du travail"],
        },
        {
          facette: "DATE_VERSION",
          singleDate: toTimestamp(date),
        },
      ],
      pageNumber: 1,
      pageSize: 10,
      operateur: "ET",
      sort: "PERTINENCE",
      typePagination: "DEFAUT",
    },
  };

  const result = await ingestLegifranceFromSearch({
    sourceName: "Code du travail (Legifrance)",
    documentTitle: `Code du travail - ${date}`,
    payload,
    maxPages,
  });

  console.log(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
