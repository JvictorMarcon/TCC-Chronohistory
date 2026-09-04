// ============================================
// GALERIA HISTÓRICA — CHRONOHISTORY
// ============================================

const API_BASE = 'https://backend-tcc-cronohistory.onrender.com';
const API_LOCAL = 'http://localhost:5000';

// ── Estado Global ─────────────────────────
let todosEventos = [];
let eventosFiltrados = [];
let filtroAtual = 'todos';
let buscaAtual = '';
let galeriaEventoAtivo = null;

// ── Acervo Oficial Completo de Imagens Históricas (100 Obras da Wikipédia) ──
const ACERVO_HISTORICO_DEFAULT = [
    {
        id: 1,
        nome: 'Domínio do fogo',
        lugar: 'África, Ásia e Europa',
        periodoNome: 'Pré-História',
        ano: 'c. 1.5 milhões a.C. - 400 mil a.C.',
        oque_aconteceu: 'Diferentes espécies humanas aprenderam a controlar, produzir e manter o fogo para aquecimento, proteção e cocção de alimentos.',
        oque_mudou: 'O fogo permitiu a expansão para climas frios, melhorou a digestão e a biodisponibilidade de nutrientes e fortaleceu os laços sociais.',
        curiosidades: ['O uso controlado do fogo é um dos maiores divisores de águas na evolução biológica e social do ser humano.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Campsite_at_dusk.jpg/800px-Campsite_at_dusk.jpg'
    },
    {
        id: 2,
        nome: 'Revolução Neolítica e surgimento da agricultura',
        lugar: 'Crescente Fértil (Oriente Médio)',
        periodoNome: 'Pré-História',
        ano: 'c. 10.000 a.C. - 8.000 a.C.',
        oque_aconteceu: 'Grupos humanos domesticaram plantas, como trigo e cevada, e animais, como ovelhas, cabras e bois, passando da caça-coleta para a produção de alimentos.',
        oque_mudou: 'Surgiram assentamentos permanentes, aumento populacional, divisão do trabalho e tecnologias como cerâmica.',
        curiosidades: ['A agricultura permitiu o nascimento das primeiras cidades da humanidade.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Ploughing_and_sowing_in_ancient_Egypt.jpg/800px-Ploughing_and_sowing_in_ancient_Egypt.jpg'
    },
    {
        id: 3,
        nome: 'Primeiras ferramentas de pedra lascada',
        lugar: 'África Oriental',
        periodoNome: 'Pré-História',
        ano: 'c. 2.6 milhões a.C.',
        oque_aconteceu: 'Hominídeos antigos começaram a lascar pedras para criar ferramentas cortantes, iniciando o Paleolítico.',
        oque_mudou: 'Foi um marco no início da tecnologia humana, permitindo cortar carne, quebrar ossos e raspar peles.',
        curiosidades: ['A indústria lítica Olduvaiense na Tanzânia é a mais antiga documentada.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Canto_tallado_2-Guelmim-Es_Semara.jpg/960px-Canto_tallado_2-Guelmim-Es_Semara.jpg'
    },
    {
        id: 4,
        nome: 'Primeiras manifestações artísticas (pinturas rupestres)',
        lugar: 'Europa, África e Ásia',
        periodoNome: 'Pré-História',
        ano: 'c. 40.000 a.C. - 35.000 a.C.',
        oque_aconteceu: 'Humanos anatomicamente modernos produziram pinturas em cavernas, esculturas em marfim e osso e objetos rituais.',
        oque_mudou: 'Expressão simbólica e artística que inaugurou a comunicação visual e rituais complexos.',
        curiosidades: ['As cavernas de Lascaux e Chauvet preservam obras com mais de 30 mil anos.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Caverna_de_Lascaux.jpg/800px-Caverna_de_Lascaux.jpg'
    },
    {
        id: 5,
        nome: 'Construção de Göbekli Tepe',
        lugar: 'Anatólia (atual Turquia)',
        periodoNome: 'Pré-História',
        ano: 'c. 9600 a.C. - 8000 a.C.',
        oque_aconteceu: 'Grupos humanos construíram estruturas monumentais com pilares de pedra decorados com relevos de animais.',
        oque_mudou: 'Considerado o templo mais antigo do mundo, construído antes mesmo da agricultura se consolidar.',
        curiosidades: ['Göbekli Tepe revolucionou a arqueologia ao mostrar que templos monumentais surgiram antes das cidades.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/G%C3%B6bekli_Tepe%2C_Urfa.jpg/960px-G%C3%B6bekli_Tepe%2C_Urfa.jpg'
    },
    {
        id: 6,
        nome: 'Invenção da escrita',
        lugar: 'Mesopotâmia (atual Iraque)',
        periodoNome: 'Idade Antiga',
        ano: 'c. 3400 a.C. - 3200 a.C.',
        oque_aconteceu: 'Os sumérios desenvolveram a escrita cuneiforme, inicialmente para registrar transações comerciais e administrativas.',
        oque_mudou: 'Permitiu o registro da história, leis, literatura e a administração de grandes reinos.',
        curiosidades: ['A escrita cuneiforme era grafada com estiletes de junco em tabletes de argila fresca.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Cyrus_cylinder_extract.svg/960px-Cyrus_cylinder_extract.svg.png'
    },
    {
        id: 7,
        nome: 'Unificação do Egito',
        lugar: 'Egito Antigo',
        periodoNome: 'Idade Antiga',
        ano: 'c. 3100 a.C.',
        oque_aconteceu: 'O faraó Menes (Narmer) unificou o Alto e o Baixo Egito, estabelecendo a primeira dinastia.',
        oque_mudou: 'Deu início a uma das civilizações mais duradouras e monumentais da história humana.',
        curiosidades: ['A Paleta de Narmer registra a vitória e a unificação das duas coroas do Egito.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Narmer_Palette_verso_serekh.png/800px-Narmer_Palette_verso_serekh.png'
    },
    {
        id: 8,
        nome: 'Código de Hamurabi',
        lugar: 'Babilônia (Mesopotâmia)',
        periodoNome: 'Idade Antiga',
        ano: 'c. 1754 a.C.',
        oque_aconteceu: 'O rei Hamurabi codificou leis em uma estela de basalto, tratando de comércio, propriedade, família e punições.',
        oque_mudou: 'Famoso pelo princípio de Talião ("olho por olho, dente por dente"), consolidou a jurisprudência escrita.',
        curiosidades: ['A estela original está exposta no Museu do Louvre, em Paris.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Code-de-Hammurabi-1.jpg/960px-Code-de-Hammurabi-1.jpg'
    },
    {
        id: 9,
        nome: 'Democracia ateniense',
        lugar: 'Atenas (Grécia Antiga)',
        periodoNome: 'Idade Antiga',
        ano: '508 a.C. - 507 a.C.',
        oque_aconteceu: 'Clístenes instituiu reformas que organizaram a democracia direta em Atenas.',
        oque_mudou: 'Cidadãos atenienses podiam debater e votar diretamente as leis e decisões da pólis na Eclésia.',
        curiosidades: ['O ostracismo era uma votação anual para exilar cidadãos que ameaçassem a democracia.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Discurso_funebre_pericles.PNG/800px-Discurso_funebre_pericles.PNG'
    },
    {
        id: 10,
        nome: 'Alexandre, o Grande e o Helenismo',
        lugar: 'Macedônia, Grécia, Egito e Pérsia',
        periodoNome: 'Idade Antiga',
        ano: '336 a.C. - 323 a.C.',
        oque_aconteceu: 'Alexandre III da Macedônia conquistou o Império Persa, o Egito e expandiu seus domínios até a Índia.',
        oque_mudou: 'Espalhou a cultura grega pelo Oriente, originando a rica era helenística.',
        curiosidades: ['Ele fundou mais de 20 cidades com o nome de Alexandria.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Alexander_Mosaic_detail_of_Alexander_the_Great_%283x4_cropped%29.jpg/960px-Alexander_Mosaic_detail_of_Alexander_the_Great_%283x4_cropped%29.jpg'
    },
    {
        id: 11,
        nome: 'Fundação do Império Romano',
        lugar: 'Roma',
        periodoNome: 'Idade Antiga',
        ano: '27 a.C.',
        oque_aconteceu: 'Otávio Augusto tornou-se o primeiro imperador romano, encerrando as guerras civis da República.',
        oque_mudou: 'Iniciou a Pax Romana e transformou Roma no maior império do mar Mediterrâneo.',
        curiosidades: ['Augusto reorganizou a cidade e dizia ter "encontrado Roma de tijolo e deixado-a de mármore".'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Statue-Augustus.jpg/800px-Statue-Augustus.jpg'
    },
    {
        id: 12,
        nome: 'Queda do Império Romano do Ocidente',
        lugar: 'Roma e Ravena',
        periodoNome: 'Idade Antiga',
        ano: '476 d.C.',
        oque_aconteceu: 'O general germânico Odoacro depôs Rômulo Augusto, marcando o fim tradicional da Antiguidade.',
        oque_mudou: 'Fragmentação da Europa em reinos germânicos e início da Idade Média.',
        curiosidades: ['O Império Romano do Oriente (Bizantino) continuou existindo por quase mais mil anos, até 1453.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Course_of_Empire_Destruction_1836_Thomas_Cole.jpg/800px-Course_of_Empire_Destruction_1836_Thomas_Cole.jpg'
    },
    {
        id: 13,
        nome: 'Reino Franco e Carlos Magno',
        lugar: 'Europa Ocidental (França e Alemanha)',
        periodoNome: 'Idade Média',
        ano: '768 d.C. - 814 d.C.',
        oque_aconteceu: 'Carlos Magno unificou grande parte da Europa Ocidental e foi coroado Imperador dos Romanos em 800.',
        oque_mudou: 'Promoveu o Renascimento Carolíngio, estimulando as artes, a educação e a preservação de manuscritos.',
        curiosidades: ['Carlos Magno é considerado o "Pai da Europa" medieval.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Charlemagne-by-Durer.jpg/800px-Charlemagne-by-Durer.jpg'
    },
    {
        id: 14,
        nome: 'Idade de Ouro Islâmica',
        lugar: 'Bagdá, Cairo e Córdoba',
        periodoNome: 'Idade Média',
        ano: '750 d.C. - 1258 d.C.',
        oque_aconteceu: 'O mundo islâmico viveu um extraordinário florescimento científico, filosófico, matemático e médico.',
        oque_mudou: 'Desenvolvimento da álgebra, avanços na astronomia, medicina e preservação dos clássicos gregos.',
        curiosidades: ['A Casa da Sabedoria em Bagdá reunia estudiosos e obras de todo o mundo conhecido.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Scholars_at_an_Abbasid_library.jpg/800px-Scholars_at_an_Abbasid_library.jpg'
    },
    {
        id: 15,
        nome: 'As Cruzadas',
        lugar: 'Oriente Médio e Europa',
        periodoNome: 'Idade Média',
        ano: '1095 d.C. - 1291 d.C.',
        oque_aconteceu: 'Expedições militares e religiosas convocadas pelo papado com o objetivo de controlar a Terra Santa.',
        oque_mudou: 'Reabertura de rotas comerciais no Mediterrâneo e intenso intercâmbio cultural entre Oriente e Ocidente.',
        curiosidades: ['A Primeira Cruzada resultou na conquista de Jerusalém em 1099.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Combat_deuxi%C3%A8me_croisade.jpg/800px-Combat_deuxi%C3%A8me_croisade.jpg'
    },
    {
        id: 16,
        nome: 'Carta Magna',
        lugar: 'Inglaterra',
        periodoNome: 'Idade Média',
        ano: '1215 d.C.',
        oque_aconteceu: 'O rei João Sem Terra foi forçado pelos barões ingleses a assinar a Carta Magna em Runnymede.',
        oque_mudou: 'Estabeleceu pela primeira vez que o monarca estava submetido à lei, embrião dos direitos constitucionais.',
        curiosidades: ['A Carta Magna é um dos documentos fundamentais para o desenvolvimento da democracia moderna.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Magna_Carta_%28British_Library_Cotton_MS_Augustus_II.106%29.jpg/960px-Magna_Carta_%28British_Library_Cotton_MS_Augustus_II.106%29.jpg'
    },
    {
        id: 17,
        nome: 'Peste Negra',
        lugar: 'Europa, Ásia e Norte da África',
        periodoNome: 'Idade Média',
        ano: '1347 d.C. - 1351 d.C.',
        oque_aconteceu: 'Uma devastadora pandemia de peste bubônica transmitida por pulgas em ratos matou de 30% a 50% da população europeia.',
        oque_mudou: 'Crise demográfica que acelerou o fim do feudalismo e aumentou o valor do trabalho camponês.',
        curiosidades: ['A peste chegou aos portos europeus através de navios mercantes genoveses vindos do Mar Negro.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Bubonic_plague-pt.svg/960px-Bubonic_plague-pt.svg.png'
    },
    {
        id: 18,
        nome: 'Queda de Constantinopla',
        lugar: 'Constantinopla (atual Istambul)',
        periodoNome: 'Idade Média',
        ano: '1453 d.C.',
        oque_aconteceu: 'O sultão otomano Mehmed II conquistou Constantinopla, encerrando o Império Bizantino.',
        oque_mudou: 'Bloqueio das rotas terrestres para as Índias, impulsionando as Grandes Navegações pelo oceano Atlântico.',
        curiosidades: ['A queda da cidade marca para muitos historiadores a transição da Idade Média para a Idade Moderna.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Fausto_Zonaro_-_The_Conquest_of_Constantinople.jpg/800px-Fausto_Zonaro_-_The_Conquest_of_Constantinople.jpg'
    },
    {
        id: 19,
        nome: 'Imprensa de Gutenberg',
        lugar: 'Mainz (Alemanha)',
        periodoNome: 'Idade Moderna',
        ano: 'c. 1440 d.C. - 1455 d.C.',
        oque_aconteceu: 'Johannes Gutenberg aperfeiçoou a prensa móvel com tipos metálicos, imprimindo a famosa Bíblia de Gutenberg.',
        oque_mudou: 'Democratizou o acesso aos livros, impulsionou o Renascimento, a Ciência e a Reforma Protestante.',
        curiosidades: ['Antes de Gutenberg, cada livro levava meses ou anos para ser copiado à mão por monges copistas.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Gutenberg_Bible%2C_Lenox_Copy%2C_New_York_Public_Library%2C_2009._Pic_01.jpg/960px-Gutenberg_Bible%2C_Lenox_Copy%2C_New_York_Public_Library%2C_2009._Pic_01.jpg'
    },
    {
        id: 20,
        nome: 'Chegada de Colombo à América',
        lugar: 'Bahamas / Caribe',
        periodoNome: 'Idade Moderna',
        ano: '1492 d.C.',
        oque_aconteceu: 'Cristóvão Colombo, financiado pela Coroa Espanhola, cruzou o Atlântico e desembarcou no continente americano.',
        oque_mudou: 'Iniciou a colonização europeia das Américas e a integração global de economias e culturas.',
        curiosidades: ['Colombo morreu acreditando ter chegado às costas orientais da Ásia.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Viajes_de_colon_en2.svg/960px-Viajes_de_colon_en2.svg.png'
    },
    {
        id: 21,
        nome: 'Descobrimento do Brasil',
        lugar: 'Porto Seguro (Bahia)',
        periodoNome: 'Idade Moderna',
        ano: '1500 d.C.',
        oque_aconteceu: 'A esquadra portuguesa comandada por Pedro Álvares Cabral avistou o Monte Pascoal e aportou no Brasil.',
        oque_mudou: 'Início da colonização e exploração do território brasileiro por Portugal.',
        curiosidades: ['A Carta de Pero Vaz de Caminha é considerada a "certidão de nascimento" do Brasil.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Primeira_Missa_no_Brasil_-_Victor_Meirelles.jpg/800px-Primeira_Missa_no_Brasil_-_Victor_Meirelles.jpg'
    },
    {
        id: 22,
        nome: 'Reforma Protestante',
        lugar: 'Wittenberg (Alemanha)',
        periodoNome: 'Idade Moderna',
        ano: '1517 d.C.',
        oque_aconteceu: 'Martinho Lutero fixou as 95 Teses na porta da igreja de Wittenberg, contestando abusos e a venda de indulgências.',
        oque_mudou: 'Divisão religiosa na Europa com o surgimento das igrejas luterana, calvinista e anglicana.',
        curiosidades: ['A tradução da Bíblia para o alemão feita por Lutero ajudou a unificar o idioma alemão.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Lucas_Cranach_d.%C3%84._-_Martin_Luther%2C_1528_%28Veste_Coburg%29.jpg/960px-Lucas_Cranach_d.%C3%84._-_Martin_Luther%2C_1528_%28Veste_Coburg%29.jpg'
    },
    {
        id: 23,
        nome: 'Renascimento Cultural e Artístico',
        lugar: 'Florença, Roma e Veneza',
        periodoNome: 'Idade Moderna',
        ano: 'c. 1300 d.C. - 1600 d.C.',
        oque_aconteceu: 'Mestres como Leonardo da Vinci, Michelangelo e Rafael resgataram o humanismo e o naturalismo clássico.',
        oque_mudou: 'Revolução nas artes visuais, arquitetura, música e literatura, valorizando o potencial humano e a razão.',
        curiosidades: ['A Mona Lisa e o teto da Capela Sistina são ícones eternos deste período.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Escola_de_Atenas_-_Vaticano_2.jpg/960px-Escola_de_Atenas_-_Vaticano_2.jpg'
    },
    {
        id: 24,
        nome: 'Revolução Científica',
        lugar: 'Europa',
        periodoNome: 'Idade Moderna',
        ano: '1543 d.C. - 1687 d.C.',
        oque_aconteceu: 'Copérnico, Galileu Galilei, Kepler e Isaac Newton desenvolveram o método científico experimental e a física clássica.',
        oque_mudou: 'Substituição do modelo geocêntrico pelo heliocêntrico e compreensão mecânica do universo.',
        curiosidades: ['Isaac Newton formulou as Leis do Movimento e da Gravitação Universal em 1687.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg/960px-Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg'
    },
    {
        id: 25,
        nome: 'Iluminismo',
        lugar: 'França, Grã-Bretanha e Europa',
        periodoNome: 'Idade Moderna',
        ano: 'c. 1715 d.C. - 1789 d.C.',
        oque_aconteceu: 'Filósofos como Voltaire, Rousseau, Montesquieu e Locke defenderam a razão, a liberdade e a separação de poderes.',
        oque_mudou: 'Inspirou as revoluções liberais e a criação dos direitos humanos universais.',
        curiosidades: ['A Enciclopédia de Diderot e d’Alembert buscou sintetizar todo o conhecimento humano.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Les_salons_au_XVIIIe_si%C3%A8cle_-_Histoire_Image.jpg/960px-Les_salons_au_XVIIIe_si%C3%A8cle_-_Histoire_Image.jpg'
    },
    {
        id: 26,
        nome: 'Independência dos Estados Unidos',
        lugar: 'Filadélfia (EUA)',
        periodoNome: 'Idade Moderna',
        ano: '1776 d.C.',
        oque_aconteceu: 'As Treze Colônias aprovaram a Declaração de Independência em 4 de julho, rompendo com o domínio britânico.',
        oque_mudou: 'Criação da primeira república constitucional moderna baseada em ideais iluministas.',
        curiosidades: ['Thomas Jefferson foi o principal redator da Declaração de Independência.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/United_States_Declaration_of_Independence.jpg/960px-United_States_Declaration_of_Independence.jpg'
    },
    {
        id: 27,
        nome: 'Revolução Francesa',
        lugar: 'Paris (França)',
        periodoNome: 'Idade Contemporânea',
        ano: '1789 d.C. - 1799 d.C.',
        oque_aconteceu: 'A Tomada da Bastilha e a Declaração dos Direitos do Homem e do Cidadão derrubaram o Antigo Regime.',
        oque_mudou: 'Fim do absolutismo feudal na França e difusão dos valores de Liberdade, Igualdade e Fraternidade.',
        curiosidades: ['A Queda da Bastilha em 14 de julho de 1789 tornou-se a data nacional francesa.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/La_Libert%C3%A9_guidant_le_peuple_-_Eug%C3%A8ne_Delacroix_-_Mus%C3%A9e_du_Louvre_Peintures_RF_129_-_apr%C3%A8s_restauration_2024.jpg/960px-La_Libert%C3%A9_guidant_le_peuple_-_Eug%C3%A8ne_Delacroix_-_Mus%C3%A9e_du_Louvre_Peintures_RF_129_-_apr%C3%A8s_restauration_2024.jpg'
    },
    {
        id: 28,
        nome: 'Independência do Brasil',
        lugar: 'São Paulo (Brasil)',
        periodoNome: 'Idade Contemporânea',
        ano: '1822 d.C.',
        oque_aconteceu: 'Dom Pedro I proclamou a independência às margens do rio Ipiranga em 7 de setembro de 1822.',
        oque_mudou: 'O Brasil tornou-se um Império independente de Portugal, mantendo sua unidade territorial.',
        curiosidades: ['O famoso quadro "Independência ou Morte" foi pintado por Pedro Américo em 1888.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Pedro_Am%C3%A9rico_-_Independ%C3%AAncia_ou_Morte_-_cores_ajustadas.jpg/800px-Pedro_Am%C3%A9rico_-_Independ%C3%AAncia_ou_Morte_-_cores_ajustadas.jpg'
    },
    {
        id: 29,
        nome: 'Primeira Guerra Mundial',
        lugar: 'Europa e frentes globais',
        periodoNome: 'Idade Contemporânea',
        ano: '1914 d.C. - 1918 d.C.',
        oque_aconteceu: 'Conflito militar em escala planetária impulsionado por alianças imperialistas e tensões nacionalistas.',
        oque_mudou: 'Queda de quatro impérios (Alemão, Austro-Húngaro, Russo e Otomano) e redesignação das fronteiras mundiais.',
        curiosidades: ['A guerra popularizou o uso de aviões, tanques blindados e comunicação via rádio.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/WWImontage.jpg/960px-WWImontage.jpg'
    },
    {
        id: 30,
        nome: 'Segunda Guerra Mundial',
        lugar: 'Europa, Pacífico, África e Ásia',
        periodoNome: 'Idade Contemporânea',
        ano: '1939 d.C. - 1945 d.C.',
        oque_aconteceu: 'Guerra global entre os Aliados e as potências do Eixo (Alemanha nazista, Itália fascista e Japão).',
        oque_mudou: 'Derrota do nazifascismo, criação da ONU e início da Guerra Fria entre EUA e União Soviética.',
        curiosidades: ['Foi o conflito mais letal da história humana, envolvendo mais de 100 milhões de combatentes.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/NRAWanjialing1.jpg/800px-NRAWanjialing1.jpg'
    },
    {
        id: 31,
        nome: 'Chegada do Homem à Lua',
        lugar: 'Mar da Tranquilidade (Lua)',
        periodoNome: 'Idade Contemporânea',
        ano: '1969 d.C.',
        oque_aconteceu: 'A missão Apollo 11 levou os astronautas Neil Armstrong e Buzz Aldrin a pisarem no solo lunar em 20 de julho.',
        oque_mudou: 'Ápice da Corrida Espacial e conquista tecnológica monumental para a humanidade.',
        curiosidades: ['"Um pequeno passo para o homem, um salto gigantesco para a humanidade" foi a frase dita por Armstrong.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Aldrin_Apollo_11_original.jpg/800px-Aldrin_Apollo_11_original.jpg'
    },
    {
        id: 32,
        nome: 'Queda do Muro de Berlim',
        lugar: 'Berlim (Alemanha)',
        periodoNome: 'Idade Contemporânea',
        ano: '1989 d.C.',
        oque_aconteceu: 'Cidadãos alemães derrubaram o muro que dividia a cidade de Berlim desde 1961.',
        oque_mudou: 'Símbolo do fim da Guerra Fria e prelúdio para a reunificação alemã e dissolução da URSS.',
        curiosidades: ['O muro estendeu-se por 155 km dividindo famílias por quase três décadas.'],
        imagem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Berlinermauer.jpg/960px-Berlinermauer.jpg'
    }
];

// ── Filtro de período para cada botão ─────
const FILTRO_PERIODOS = {
    'todos': 'Todos',
    'pre-historia': ['pré-história', 'pré historia', 'pre-historia', 'prehistória', 'pre história'],
    'idade-antiga': ['idade antiga', 'antiguidade', 'antiga', 'egito', 'grécia', 'roma', 'greco', 'romano', 'mesopotâmia', 'babilônia'],
    'idade-media': ['idade média', 'idade media', 'medieval', 'feudalismo'],
    'idade-moderna': ['idade moderna', 'modernidade', 'moderna', 'renascimento', 'iluminismo', 'reforma'],
    'idade-contemporanea': ['idade contemporânea', 'idade contemporanea', 'contemporâneo', 'contemporaneo', 'contemporânea', 'contemporanea', 'século xx', 'século xxi'],
};

function matchFiltro(evento, filtro) {
    if (filtro === 'todos') return true;
    const periodoLower = (evento.periodoNome || '').toLowerCase().trim();
    const keywords = FILTRO_PERIODOS[filtro] || [];
    return keywords.some(kw => periodoLower.includes(kw));
}

// ── Verificação de Autenticação ────────────
function verificarAutenticacao() {
    try {
        const token = localStorage.getItem('chronohistory_token');
        const user = localStorage.getItem('chronohistory_user');
        if (!token && !user) {
            alert('Acesso restrito! Você precisa estar logado para acessar a Galeria Histórica de Imagens.');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    } catch (e) {
        return true;
    }
}

// ============================================
// Inicialização
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!verificarAutenticacao()) return;

    // Inicia imediatamente com o acervo base garantindo exibição instantânea
    todosEventos = ACERVO_HISTORICO_DEFAULT.map(e => ({
        ...e,
        globalId: `acervo_${e.id}`
    }));
    renderGaleria();

    // Carrega dados adicionais de endpoints assincronamente
    await carregarDados();
    setupEventListeners();
    checkUrlParams();
});

// ============================================
// Carregar Dados da API e de Arquivos Locais
// ============================================
async function carregarDados() {
    // 1. Tenta buscar imagens cadastradas na API Supabase /imagens
    const endpointsImagens = [
        `${API_BASE}/imagens`,
        `${API_LOCAL}/imagens`
    ];

    let imagensBanco = [];
    for (const url of endpointsImagens) {
        try {
            const resp = await fetch(url);
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data) && data.length > 0) {
                    imagensBanco = data;
                    break;
                } else if (data && Array.isArray(data.data) && data.data.length > 0) {
                    imagensBanco = data.data;
                    break;
                }
            }
        } catch (_) {}
    }

    if (imagensBanco.length > 0) {
        todosEventos = imagensBanco.map((img, index) => {
            const periodoNome = img.periodo || 'História';
            return {
                id: img.id || index + 1,
                globalId: `img_db_${img.id || index + 1}`,
                nome: img.titulo || 'Obra Histórica',
                ano: img.ano || 'Data desconhecida',
                lugar: img.pintor ? `Autor/Região: ${img.pintor}` : 'Origem documentada',
                oque_aconteceu: img.contexto || 'Registro integrante do acervo histórico.',
                oque_mudou: '',
                curiosidades: [],
                legado: '',
                figuras_principais: [],
                informacoes_adicionais: '',
                periodoNome: periodoNome,
                periodoId: index,
                imagem: img.url || 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Escola_de_Atenas_-_Vaticano_2.jpg/960px-Escola_de_Atenas_-_Vaticano_2.jpg'
            };
        });
        renderGaleria();
        return;
    }

    // 2. Tenta ler periodos.json (tentando caminho relativo e absoluto)
    const jsonPaths = ['../periodos.json', 'periodos.json', '/periodos.json'];
    for (const path of jsonPaths) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                const data = await response.json();
                const periodos = data.periodos || (Array.isArray(data) ? data : []);
                if (periodos.length > 0) {
                    processarPeriodosJson(periodos);
                    renderGaleria();
                    return;
                }
            }
        } catch (_) {}
    }
}

function processarPeriodosJson(periodos) {
    const eventosMapeados = [];
    periodos.forEach((periodo, pIdx) => {
        const pNome = periodo.nome || 'História';
        if (periodo.acontecimentos && Array.isArray(periodo.acontecimentos)) {
            periodo.acontecimentos.forEach((evt, eIdx) => {
                // Procura imagem de alta resolução se houver correspondente no acervo
                const matchDefault = ACERVO_HISTORICO_DEFAULT.find(
                    d => d.nome.toLowerCase() === evt.nome.toLowerCase()
                );

                const imgUrl = matchDefault
                    ? matchDefault.imagem
                    : (evt.imagem && evt.imagem.startsWith('http')
                        ? evt.imagem
                        : 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Escola_de_Atenas_-_Vaticano_2.jpg/960px-Escola_de_Atenas_-_Vaticano_2.jpg');

                eventosMapeados.push({
                    id: evt.id || `${pIdx}_${eIdx}`,
                    globalId: `periodo_${pIdx}_evento_${eIdx}`,
                    nome: evt.nome || `Evento ${eIdx + 1}`,
                    ano: evt.ano || 'Data histórica',
                    lugar: evt.lugar || 'Diversos continentes',
                    oque_aconteceu: evt.oque_aconteceu || '',
                    oque_mudou: evt.oque_mudou || '',
                    curiosidades: evt.curiosidades || [],
                    legado: evt.legado || '',
                    figuras_principais: evt.figuras_principais || [],
                    informacoes_adicionais: evt.informacoes_adicionais || '',
                    periodoNome: pNome,
                    periodoId: pIdx,
                    imagem: imgUrl
                });
            });
        }
    });

    if (eventosMapeados.length > 0) {
        todosEventos = eventosMapeados;
    }
}

// ============================================
// Renderizar Galeria
// ============================================
function renderGaleria() {
    const grid = document.getElementById('galeriaGrid');
    const contador = document.getElementById('contadorEventos');
    const semResultados = document.getElementById('semResultados');

    if (!grid) return;

    // Aplicar filtro de período e busca
    eventosFiltrados = todosEventos.filter(e => {
        const matchPeriodo = matchFiltro(e, filtroAtual);
        const matchBusca = buscaAtual === '' ||
            e.nome.toLowerCase().includes(buscaAtual) ||
            (e.periodoNome || '').toLowerCase().includes(buscaAtual) ||
            (e.lugar || '').toLowerCase().includes(buscaAtual) ||
            (e.ano || '').toLowerCase().includes(buscaAtual);
        return matchPeriodo && matchBusca;
    });

    if (contador) {
        contador.textContent = `${eventosFiltrados.length} evento${eventosFiltrados.length !== 1 ? 's' : ''}`;
    }

    grid.innerHTML = '';

    if (eventosFiltrados.length === 0) {
        if (semResultados) semResultados.classList.remove('hidden');
        return;
    }
    if (semResultados) semResultados.classList.add('hidden');

    eventosFiltrados.forEach((evento, index) => {
        const card = criarCardGaleria(evento, index);
        grid.appendChild(card);
    });
}

// ============================================
// Criar Card da Galeria
// ============================================
function criarCardGaleria(evento, index) {
    const card = document.createElement('div');
    card.className = 'galeria-card card-visible';
    card.setAttribute('data-event-id', evento.globalId);

    const descricaoCorta = evento.oque_aconteceu
        ? evento.oque_aconteceu.substring(0, 115) + (evento.oque_aconteceu.length > 115 ? '...' : '')
        : 'Clique para conferir detalhes históricos e a documentação desta obra.';

    card.innerHTML = `
        <div class="card-imagem-wrapper">
            <img
                src="${evento.imagem}"
                alt="${escapeHtml(evento.nome)}"
                class="card-imagem"
                loading="lazy"
                onerror="this.onerror=null; this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Escola_de_Atenas_-_Vaticano_2.jpg/960px-Escola_de_Atenas_-_Vaticano_2.jpg';"
            />
            <div class="card-imagem-overlay"></div>
            <div class="card-periodo-badge">${escapeHtml(evento.periodoNome)}</div>
        </div>
        <div class="card-corpo">
            <h3 class="card-titulo">${escapeHtml(evento.nome)}</h3>
            <div class="card-meta">
                <span class="card-meta-item">⏳ ${escapeHtml(evento.ano)}</span>
                <span class="card-meta-item">📍 ${escapeHtml(evento.lugar)}</span>
            </div>
            <p class="card-descricao">${escapeHtml(descricaoCorta)}</p>
            <div class="card-acoes">
                <button class="btn-ver-evento" type="button">
                    Ver Evento
                </button>
            </div>
        </div>
    `;

    // Eventos de clique
    card.querySelector('.card-imagem-wrapper').addEventListener('click', () => abrirDetalhe(evento.globalId));
    card.querySelector('.btn-ver-evento').addEventListener('click', (e) => {
        e.stopPropagation();
        abrirDetalhe(evento.globalId);
    });

    return card;
}

// ============================================
// Abrir Modal de Detalhes
// ============================================
function abrirDetalhe(globalId) {
    const evento = todosEventos.find(e => e.globalId === globalId);
    if (!evento) return;

    galeriaEventoAtivo = evento;

    const modal = document.getElementById('galeriaModal');
    const modalImagem = document.getElementById('modalImagem');
    const modalTitulo = document.getElementById('modalTitulo');
    const modalPeriodo = document.getElementById('modalPeriodo');
    const modalAno = document.getElementById('modalAno');
    const modalLugar = document.getElementById('modalLugar');
    const modalDescricao = document.getElementById('modalDescricao');
    const modalMudou = document.getElementById('modalMudou');
    const modalCuriosidades = document.getElementById('modalCuriosidades');
    const modalLegado = document.getElementById('modalLegado');
    const modalFonte = document.getElementById('modalFonte');

    if (modalImagem) {
        modalImagem.src = evento.imagem;
        modalImagem.onerror = () => {
            modalImagem.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Escola_de_Atenas_-_Vaticano_2.jpg/960px-Escola_de_Atenas_-_Vaticano_2.jpg';
        };
        modalImagem.alt = evento.nome;
    }

    if (modalTitulo) modalTitulo.textContent = evento.nome;
    if (modalPeriodo) modalPeriodo.textContent = evento.periodoNome;
    if (modalAno) modalAno.textContent = evento.ano;
    if (modalLugar) modalLugar.textContent = evento.lugar;
    if (modalDescricao) modalDescricao.textContent = evento.oque_aconteceu || 'Descrição não disponível.';

    // Seção O que mudou
    const secMudou = document.getElementById('secaoMudou');
    if (secMudou) {
        if (evento.oque_mudou) {
            if (modalMudou) modalMudou.textContent = evento.oque_mudou;
            secMudou.classList.remove('hidden');
        } else {
            secMudou.classList.add('hidden');
        }
    }

    // Seção Legado
    const secLegado = document.getElementById('secaoLegado');
    if (secLegado) {
        if (evento.legado) {
            if (modalLegado) modalLegado.textContent = evento.legado;
            secLegado.classList.remove('hidden');
        } else {
            secLegado.classList.add('hidden');
        }
    }

    // Curiosidades
    const secCuriosidades = document.getElementById('secaoCuriosidades');
    if (secCuriosidades) {
        if (evento.curiosidades && evento.curiosidades.length > 0) {
            if (modalCuriosidades) {
                modalCuriosidades.innerHTML = evento.curiosidades.slice(0, 4)
                    .map(c => `<li class="modal-curiosidade-item">${escapeHtml(c)}</li>`)
                    .join('');
            }
            secCuriosidades.classList.remove('hidden');
        } else {
            secCuriosidades.classList.add('hidden');
        }
    }

    if (modalFonte) {
        modalFonte.textContent = `Chronohistory — Acervo Histórico / ${evento.periodoNome}`;
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    }
}

function fecharDetalhe() {
    const modal = document.getElementById('galeriaModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
}

// ============================================
// Verificar URL Params
// ============================================
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const eventoId = params.get('evento');
    if (eventoId) {
        setTimeout(() => {
            const evento = todosEventos.find(
                e => e.globalId === eventoId || e.nome.toLowerCase().includes(eventoId.toLowerCase())
            );
            if (evento) abrirDetalhe(evento.globalId);
        }, 300);
    }
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Filtros de período por botões
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filtro-btn').forEach(b => {
                b.classList.remove('filtro-ativo');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('filtro-ativo');
            btn.setAttribute('aria-pressed', 'true');
            filtroAtual = btn.getAttribute('data-filtro') || 'todos';
            renderGaleria();
        });
    });

    // Campo de busca em tempo real
    const searchInput = document.getElementById('galeriaSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            buscaAtual = e.target.value.toLowerCase().trim();
            renderGaleria();
        });
    }

    // Fechar modal no botão
    const fecharBtn = document.getElementById('fecharGaleriaModal');
    if (fecharBtn) {
        fecharBtn.addEventListener('click', fecharDetalhe);
    }

    // Fechar modal ao clicar fora
    const modal = document.getElementById('galeriaModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) fecharDetalhe();
        });
    }

    // Tecla ESC para fechar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharDetalhe();
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}