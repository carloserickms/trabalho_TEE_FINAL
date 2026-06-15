export type Researcher = {
  id: string;
  name: string;
  title: string;
  institution: string;
  unit: string;
  area: string;
  subareas: string[];
  hIndex: number;
  publications: number;
  citations: number;
  orcid: string;
  lattes: string;
  bio: string;
  recent: { year: number; title: string; venue: string; qualis: string; doi: string }[];
  production: { year: number; count: number }[];
  collaborators: { name: string; institution: string; shared: number }[];
};

export const researchers: Researcher[] = [
  {
    id: "ana-l-cardoso",
    name: "Ana Lúcia Cardoso",
    title: "Profa. Dra., Pesquisadora 1B CNPq",
    institution: "Universidade do Estado da Bahia (UNEB)",
    unit: "Departamento de Ciências Exatas — Campus I",
    area: "Ciência da Computação",
    subareas: [
      "Recuperação de informação",
      "Processamento de linguagem natural",
      "Educação digital",
    ],
    hIndex: 22,
    publications: 87,
    citations: 1942,
    orcid: "0000-0002-5841-3320",
    lattes: "lattes.cnpq.br/3920481726354019",
    bio: "Atua na intersecção entre recuperação semântica de informação e ambientes acadêmicos digitais, com ênfase em representação vetorial de produção científica e mapeamento de competências em redes universitárias do Nordeste.",
    recent: [
      {
        year: 2024,
        title:
          "Embeddings contextuais para mapeamento de competências em repositórios institucionais",
        venue: "Anais do SBBD",
        qualis: "A2",
        doi: "10.5753/sbbd.2024.0142",
      },
      {
        year: 2024,
        title: "Hybrid retrieval over Lattes curricula: a Brazilian case study",
        venue: "Information Processing & Management",
        qualis: "A1",
        doi: "10.1016/j.ipm.2024.103891",
      },
      {
        year: 2023,
        title: "Avaliação de modelos de linguagem para sumarização de currículos acadêmicos",
        venue: "Revista Brasileira de Informática na Educação",
        qualis: "A4",
        doi: "10.5753/rbie.2023.21",
      },
      {
        year: 2023,
        title: "Open knowledge graphs from institutional repositories",
        venue: "Scientometrics",
        qualis: "A1",
        doi: "10.1007/s11192-023-04711-9",
      },
    ],
    production: [
      { year: 2017, count: 4 },
      { year: 2018, count: 6 },
      { year: 2019, count: 7 },
      { year: 2020, count: 9 },
      { year: 2021, count: 11 },
      { year: 2022, count: 12 },
      { year: 2023, count: 14 },
      { year: 2024, count: 16 },
    ],
    collaborators: [
      { name: "Marcelo H. Tavares", institution: "UFBA", shared: 14 },
      { name: "Rafaela Nunes", institution: "UFRN", shared: 9 },
      { name: "Eduardo Pires", institution: "USP", shared: 7 },
      { name: "Sofia Beltrão", institution: "UFPE", shared: 6 },
    ],
  },
  {
    id: "marcelo-h-tavares",
    name: "Marcelo H. Tavares",
    title: "Prof. Dr., Programa de Pós-Graduação em Ciência da Informação",
    institution: "Universidade Federal da Bahia (UFBA)",
    unit: "Instituto de Ciência da Informação",
    area: "Ciência da Informação",
    subareas: ["Bibliometria", "Cienciometria", "Repositórios abertos"],
    hIndex: 18,
    publications: 64,
    citations: 1280,
    orcid: "0000-0001-7720-9914",
    lattes: "lattes.cnpq.br/8821093754410022",
    bio: "Pesquisa indicadores cienciométricos aplicados à avaliação de programas de pós-graduação e métricas alternativas para a produção científica brasileira.",
    recent: [
      {
        year: 2024,
        title: "Altmetrics e impacto social da produção científica regional",
        venue: "Perspectivas em Ciência da Informação",
        qualis: "A2",
        doi: "10.1590/1981-5344/2024-005",
      },
      {
        year: 2023,
        title: "Mapas temáticos da produção em ciência da informação no Brasil",
        venue: "Encontros Bibli",
        qualis: "A4",
        doi: "10.5007/1518-2924.2023.e90112",
      },
    ],
    production: [
      { year: 2018, count: 3 },
      { year: 2019, count: 5 },
      { year: 2020, count: 6 },
      { year: 2021, count: 8 },
      { year: 2022, count: 9 },
      { year: 2023, count: 11 },
      { year: 2024, count: 12 },
    ],
    collaborators: [
      { name: "Ana Lúcia Cardoso", institution: "UNEB", shared: 14 },
      { name: "Joana M. Ribeiro", institution: "UNESP", shared: 5 },
    ],
  },
  {
    id: "rafaela-nunes",
    name: "Rafaela Nunes",
    title: "Profa. Dra., Departamento de Educação",
    institution: "Universidade Federal do Rio Grande do Norte (UFRN)",
    unit: "Centro de Educação",
    area: "Educação",
    subareas: ["Tecnologias educacionais", "Avaliação de aprendizagem", "Educação superior"],
    hIndex: 15,
    publications: 52,
    citations: 880,
    orcid: "0000-0003-4458-7711",
    lattes: "lattes.cnpq.br/4410287753398810",
    bio: "Estuda o uso pedagógico de sistemas de recomendação e mediação algorítmica em ambientes virtuais de aprendizagem em universidades públicas brasileiras.",
    recent: [
      {
        year: 2024,
        title: "Mediação algorítmica em ambientes virtuais de aprendizagem",
        venue: "Educação & Sociedade",
        qualis: "A1",
        doi: "10.1590/es.2024.276142",
      },
    ],
    production: [
      { year: 2019, count: 4 },
      { year: 2020, count: 5 },
      { year: 2021, count: 6 },
      { year: 2022, count: 8 },
      { year: 2023, count: 9 },
      { year: 2024, count: 10 },
    ],
    collaborators: [{ name: "Ana Lúcia Cardoso", institution: "UNEB", shared: 9 }],
  },
  {
    id: "eduardo-pires",
    name: "Eduardo Pires",
    title: "Prof. Dr., Instituto de Matemática e Estatística",
    institution: "Universidade de São Paulo (USP)",
    unit: "Departamento de Ciência da Computação",
    area: "Ciência da Computação",
    subareas: ["Aprendizado de máquina", "Sistemas distribuídos", "Big data"],
    hIndex: 27,
    publications: 113,
    citations: 3120,
    orcid: "0000-0002-9912-3344",
    lattes: "lattes.cnpq.br/2210884019937740",
    bio: "Desenvolve métodos de aprendizado de representações para dados textuais em larga escala, com aplicação em recuperação de informação científica.",
    recent: [
      {
        year: 2024,
        title: "Scaling sparse-dense hybrid retrieval for scholarly corpora",
        venue: "SIGIR",
        qualis: "A1",
        doi: "10.1145/3626772.3661045",
      },
    ],
    production: [
      { year: 2017, count: 7 },
      { year: 2018, count: 9 },
      { year: 2019, count: 11 },
      { year: 2020, count: 12 },
      { year: 2021, count: 14 },
      { year: 2022, count: 15 },
      { year: 2023, count: 17 },
      { year: 2024, count: 18 },
    ],
    collaborators: [{ name: "Ana Lúcia Cardoso", institution: "UNEB", shared: 7 }],
  },
  {
    id: "sofia-beltrao",
    name: "Sofia Beltrão",
    title: "Profa. Dra., Centro de Informática",
    institution: "Universidade Federal de Pernambuco (UFPE)",
    unit: "Centro de Informática",
    area: "Ciência da Computação",
    subareas: ["PLN", "Linguística computacional", "Português brasileiro"],
    hIndex: 19,
    publications: 71,
    citations: 1530,
    orcid: "0000-0001-3029-5588",
    lattes: "lattes.cnpq.br/9981029377650023",
    bio: "Investiga modelos de linguagem para o português brasileiro com foco em domínios acadêmicos e jurídicos.",
    recent: [
      {
        year: 2024,
        title: "Domain adaptation of Portuguese LLMs for academic abstracts",
        venue: "PROPOR",
        qualis: "A4",
        doi: "10.1007/978-3-031-45392-2_18",
      },
    ],
    production: [
      { year: 2018, count: 5 },
      { year: 2019, count: 6 },
      { year: 2020, count: 8 },
      { year: 2021, count: 9 },
      { year: 2022, count: 10 },
      { year: 2023, count: 12 },
      { year: 2024, count: 13 },
    ],
    collaborators: [{ name: "Ana Lúcia Cardoso", institution: "UNEB", shared: 6 }],
  },
  {
    id: "joana-m-ribeiro",
    name: "Joana M. Ribeiro",
    title: "Profa. Dra., Faculdade de Filosofia e Ciências",
    institution: "Universidade Estadual Paulista (UNESP)",
    unit: "Departamento de Ciência da Informação",
    area: "Ciência da Informação",
    subareas: ["Organização do conhecimento", "Ontologias", "Web semântica"],
    hIndex: 16,
    publications: 58,
    citations: 1010,
    orcid: "0000-0002-7714-2231",
    lattes: "lattes.cnpq.br/5512908371049928",
    bio: "Trabalha com representação do conhecimento em domínios científicos, ontologias de domínio e linked open data.",
    recent: [
      {
        year: 2023,
        title: "Ontologias para a representação de competências científicas",
        venue: "TransInformação",
        qualis: "A2",
        doi: "10.1590/2318-0889202335e230011",
      },
    ],
    production: [
      { year: 2019, count: 4 },
      { year: 2020, count: 6 },
      { year: 2021, count: 7 },
      { year: 2022, count: 8 },
      { year: 2023, count: 10 },
      { year: 2024, count: 11 },
    ],
    collaborators: [{ name: "Marcelo H. Tavares", institution: "UFBA", shared: 5 }],
  },
];

export const areas = [
  { name: "Ciência da Computação", count: 4821, share: 0.22 },
  { name: "Ciência da Informação", count: 2104, share: 0.1 },
  { name: "Educação", count: 3917, share: 0.18 },
  { name: "Engenharias", count: 2890, share: 0.13 },
  { name: "Ciências Sociais Aplicadas", count: 2210, share: 0.1 },
  { name: "Ciências da Saúde", count: 3415, share: 0.16 },
  { name: "Ciências Humanas", count: 2540, share: 0.11 },
];

export const institutions = ["UNEB", "UFBA", "USP", "UFRN", "UFPE", "UNESP", "UFMG", "UnB", "UFRJ"];

export const sampleResults = [
  {
    id: "r1",
    title: "Embeddings contextuais para mapeamento de competências em repositórios institucionais",
    authors: ["Ana Lúcia Cardoso", "Marcelo H. Tavares", "Eduardo Pires"],
    venue: "Anais do Simpósio Brasileiro de Banco de Dados (SBBD)",
    year: 2024,
    qualis: "A2",
    doi: "10.5753/sbbd.2024.0142",
    similarity: 0.94,
    pesquisadorId: "ana-l-cardoso",
    abstract:
      "Apresentamos um método de organização de currículos Lattes para mapear competências científicas em programas de pós-graduação, combinando busca textual, indicadores de produção e filtros institucionais.",
    highlights: ["competências", "busca textual", "Lattes"],
  },
  {
    id: "r2",
    title: "Hybrid retrieval over Lattes curricula: a Brazilian case study",
    authors: ["Ana Lúcia Cardoso", "Sofia Beltrão"],
    venue: "Information Processing & Management",
    year: 2024,
    qualis: "A1",
    doi: "10.1016/j.ipm.2024.103891",
    similarity: 0.91,
    pesquisadorId: "ana-l-cardoso",
    abstract:
      "Estudo de caso sobre busca híbrida em currículos da Plataforma Lattes, comparando estratégias densas, esparsas e de reordenação cruzada em consultas formuladas por gestores de pós-graduação.",
    highlights: ["busca híbrida", "Lattes", "reordenação"],
  },
  {
    id: "r3",
    title: "Open knowledge graphs from institutional repositories",
    authors: ["Ana Lúcia Cardoso", "Joana M. Ribeiro"],
    venue: "Scientometrics",
    year: 2023,
    qualis: "A1",
    doi: "10.1007/s11192-023-04711-9",
    similarity: 0.88,
    pesquisadorId: "ana-l-cardoso",
    abstract:
      "Construção de indicadores abertos a partir de registros acadêmicos brasileiros, com foco em interoperabilidade entre bases públicas e relatórios institucionais.",
    highlights: ["indicadores", "bases públicas", "interoperabilidade"],
  },
  {
    id: "r4",
    title: "Scaling sparse-dense hybrid retrieval for scholarly corpora",
    authors: ["Eduardo Pires"],
    venue: "ACM SIGIR Conference on Research and Development in Information Retrieval",
    year: 2024,
    qualis: "A1",
    doi: "10.1145/3626772.3661045",
    similarity: 0.84,
    pesquisadorId: "eduardo-pires",
    abstract:
      "Discute estratégias de escalabilidade para recuperação híbrida em corpora científicos, com avaliação em coleções multilíngues.",
    highlights: ["recuperação", "escala", "SIGIR"],
  },
  {
    id: "r5",
    title: "Avaliação de modelos de linguagem para sumarização de currículos acadêmicos",
    authors: ["Ana Lúcia Cardoso"],
    venue: "Revista Brasileira de Informática na Educação",
    year: 2023,
    qualis: "A4",
    doi: "10.5753/rbie.2023.21",
    similarity: 0.81,
    pesquisadorId: "ana-l-cardoso",
    abstract:
      "Comparação entre modelos abertos e proprietários para a tarefa de sumarização extrativa e abstrativa de currículos acadêmicos do CNPq.",
    highlights: ["sumarização", "modelos de linguagem"],
  },
];

export const suggestions = [
  "competências em recuperação de informação no Nordeste",
  "pesquisadores e produções em ciência de dados",
  "produção sobre ontologias em ciência da informação",
  "grupos de pesquisa em PLN para o português",
  "evolução da produção em educação digital 2018-2024",
];
