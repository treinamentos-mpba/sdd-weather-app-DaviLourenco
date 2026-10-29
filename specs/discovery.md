# Discovery — Aplicação de Previsão do Tempo

## Contexto

A empresa solicita uma aplicação de previsão do tempo para pessoas que precisam consultar as condições meteorológicas de uma cidade e planejar atividades próximas. O briefing pede busca de cidades, visualização do clima atual e da previsão de cinco dias, alternância entre Celsius e Fahrenheit e uso em dispositivos móveis. O público e o contexto de uso prioritário ainda precisam ser validados; um critério inicial de sucesso está proposto nas decisões para a versão inicial.

Perfis preliminares a validar:

- **Pessoa que decide a rotina do dia:** consulta rapidamente o clima atual para se preparar.
- **Pessoa que planeja compromissos ou viagens:** consulta a previsão dos próximos dias para escolher quando e como se deslocar.

## Requisitos Funcionais

- **RF1 — Buscar cidades:** permitir que a pessoa usuária pesquise uma cidade.
- **RF2 — Consultar clima atual:** exibir temperatura, condição, sensação térmica, umidade, vento e precipitação atuais para a cidade selecionada, conforme disponibilidade da fonte.
- **RF3 — Consultar previsão:** exibir para cinco dias a condição, temperaturas mínima e máxima, probabilidade de precipitação e vento, conforme disponibilidade da fonte.
- **RF4 — Alternar unidades:** permitir alternar entre Celsius e Fahrenheit e atualizar os valores de temperatura exibidos.
- **RF5 — Restaurar última cidade:** manter no navegador a última cidade pesquisada e disponibilizá-la na próxima visita.
- **RF6 — Tratar estados de consulta:** apresentar estados de carregamento, vazio e erro, com opção de tentar novamente quando a consulta falhar.

## Requisitos Não-Funcionais

- **RNF1 — Responsividade:** suportar larguras de viewport de 320 px até desktop, sem rolagem horizontal nos fluxos principais e com controles adequados ao toque.
- **RNF2 — Desempenho:** em conexão banda larga estável, 95% das buscas e consultas devem apresentar resultado em até 3 segundos, desconsiderando indisponibilidade da fonte externa.
- **RNF3 — Acessibilidade:** atender ao WCAG 2.2 nível AA nos fluxos principais, incluindo operação por teclado, nomes acessíveis e contraste adequado.
- **RNF4 — Disponibilidade:** buscar disponibilidade mensal de 99,5% para a aplicação; indisponibilidades da API meteorológica externa devem ser comunicadas e monitoradas separadamente.
- **RNF5 — Compatibilidade:** suportar as duas versões estáveis mais recentes de Chrome, Safari, Firefox e Edge, além dos navegadores móveis padrão das versões atuais e anteriores do iOS e Android.
- **RNF6 — Localização e apresentação:** apresentar a interface em português do Brasil, datas no formato DD/MM/AAAA, horas no formato de 24 horas e horários relativos ao fuso local da cidade selecionada.
- **RNF7 — Privacidade:** armazenar última cidade e unidade escolhida apenas no armazenamento local do navegador, sem conta ou sincronização em servidor.
- **RNF8 — Atualidade dos dados:** informar o horário de referência/atualização dos dados quando fornecido pela fonte meteorológica.

## Riscos

| Risco | Probabilidade | Impacto | Mitigação sugerida |
| --- | --- | --- | --- |
| Indisponibilidade, latência ou limitação de requisições da fonte meteorológica | Média | Alto | Confirmar limites e condições de uso; comunicar falhas, oferecer nova tentativa e acompanhar a disponibilidade da fonte. Não depender de cache offline na versão inicial. |
| Busca retorna cidades homônimas ou uma localização incorreta | Média | Alto | Apresentar contexto suficiente para distinguir resultados, como estado/região e país, e permitir confirmar a cidade selecionada. |
| Conexão instável impede consulta ou atualização dos dados | Média | Alto | Exibir estados de carregamento e erro, não apresentar dados meteorológicos em cache offline e oferecer nova tentativa. |
| Layout ou controles ficam difíceis de usar em telas pequenas | Média | Médio | Validar os fluxos em tamanhos móveis representativos e testar os controles em dispositivos reais ou emulados. |
| Diferenças entre unidades, arredondamento ou interpretação de datas causam leitura enganosa | Baixa | Alto | Definir regras de conversão, arredondamento, fuso horário e data de referência; validar resultados com casos conhecidos. |
| Previsões são interpretadas como garantia de condições futuras | Média | Médio | Exibir horários/datas e comunicar claramente o caráter estimado dos dados, conforme os recursos da fonte escolhida. |

## Perguntas em Aberto

Nenhuma pergunta bloqueadora permanece para a versão inicial. As decisões e os padrões adotados estão registrados abaixo e devem ser confirmados com as partes interessadas antes de compromissos de produto ou operação.

## Decisões

- **Fonte de dados — Open-Meteo, sem API key.** Justificativa: reduz fricção de integração e não exige provisionar uma credencial para a versão inicial. Resolve a escolha da fonte e a dúvida sobre necessidade de chave; cobertura, limites e termos de uso continuam sujeitos à validação.
- **Período — hoje mais os quatro dias seguintes.** Justificativa: dá uma interpretação explícita e útil para planejamento de curto prazo. Resolve a ambiguidade sobre incluir ou não o dia atual na previsão de cinco dias.
- **Unidade padrão — Celsius.** Justificativa: é o padrão esperado para a interface em português do Brasil, mantendo Fahrenheit disponível pelo controle de alternância. Resolve qual unidade aparece na primeira consulta.
- **Acesso e dados — sem autenticação e sem persistência em servidor.** Justificativa: permite consulta direta e evita criar contas ou armazenar dados de usuários no backend nesta versão. Resolve as dúvidas sobre login e armazenamento no servidor; preferências locais no navegador não são persistência de servidor.
- **Idioma — português do Brasil (pt-BR).** Justificativa: alinha a interface ao público inicial previsto. Resolve o idioma da UI; datas seguem DD/MM/AAAA, horas usam formato de 24 horas e a previsão considera o fuso local da cidade.
- **Desambiguação — listar cidade, estado/região e país para seleção.** Justificativa: diferencia localidades homônimas. Resolve como a pessoa confirma qual cidade deseja consultar.
- **Geolocalização — não solicitada nem usada; busca manual.** Justificativa: evita permissão e coleta de localização não exigidas pelo briefing. Resolve se a localização do dispositivo é necessária.
- **Conectividade — consulta online, sem suporte offline nem cache meteorológico; oferecer erro e nova tentativa.** Justificativa: evita apresentar dados potencialmente desatualizados e mantém o escopo inicial enxuto. Resolve o comportamento esperado sem conexão.
- **Dispositivos — layout responsivo de 320 px a desktop; navegadores conforme RNF5.** Justificativa: largura de viewport é verificável e mais útil que uma medida física de tela como 6,5 polegadas. Resolve a abrangência de telas e navegadores a suportar.
- **Preferências — guardar última cidade e unidade no armazenamento local do navegador, sem conta ou sincronização.** Justificativa: facilita consultas recorrentes sem persistir dados no servidor. Resolve se a última cidade e a unidade escolhida serão lembradas entre visitas.
- **Critério inicial de sucesso — pelo menos 90% das pessoas participantes de um teste de usabilidade conseguem buscar uma cidade e localizar clima atual e previsão sem ajuda.** Justificativa: oferece uma medida inicial de conclusão da tarefa principal. Resolve como avaliar sucesso enquanto público e metas finais não forem validados; metas de desempenho e disponibilidade seguem RNF2 e RNF4.

## Suposições

- A aplicação será acessada pela web; o briefing não especifica aplicativo nativo.
- A consulta será feita por cidade escolhida pela pessoa usuária; não se presume geolocalização automática.
- A fonte de dados fornecerá tanto condições atuais quanto previsões para a localização consultada.
- Celsius e Fahrenheit são as unidades de temperatura desejadas; outras unidades meteorológicas não foram solicitadas.
- A aplicação depende de uma conexão com a internet para obter dados meteorológicos atualizados.
- A última cidade e a unidade escolhida podem ser armazenadas localmente no dispositivo, sem conta ou sincronização.
- As metas de desempenho, disponibilidade e sucesso são padrões iniciais adotados para concluir o discovery e precisam de validação das partes interessadas.
- Autenticação, perfis, favoritos, geolocalização e sincronização entre dispositivos estão fora do escopo da versão inicial.
