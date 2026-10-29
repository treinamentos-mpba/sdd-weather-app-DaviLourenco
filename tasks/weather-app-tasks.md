# Weather App — Backlog de Tarefas

Tarefas ordenadas por dependência e fase de entrega. Os IDs foram preservados para manter referências existentes; a ordem de execução é a das entregas, não a ordem numérica. As respostas das APIs devem ser simuladas nos testes automatizados, exceto nas validações de integração explicitamente indicadas.

## Entrega 1 — Contratos e funções de domínio

### T-01 — Definir contratos TypeScript
- **ID:** T-01
- **Título:** Definir os tipos de domínio e erro
- **Descrição curta:** Consolidar os tipos compartilhados usados entre UI e services, conforme o modelo do plano.
- **Critérios de aceite:** os tipos listados existem com os campos e nulabilidade do plano; `WeatherData` representa clima atual ausente, erros separados de current/forecast e até cinco `ForecastDay`; `Unit` aceita somente `celsius` ou `fahrenheit`; `pnpm build` termina com código 0.
- **Rastreabilidade:** FR-01, FR-02, FR-03, FR-04, FR-05.
- **Dependências:** Nenhuma.
- **Arquivos prováveis:** `src/types/weather.ts`
- **Tipo:** Data

### T-02 — Implementar conversão de temperatura
- **ID:** T-02
- **Título:** Normalizar conversão Celsius/Fahrenheit
- **Descrição curta:** Manter Celsius como valor de origem e expor funções puras de conversão, arredondamento e rótulo.
- **Critérios de aceite:** testes Vitest verificam `0 °C → 32 °F`, `100 °C → 212 °F`, `-40 °C → -40 °F` e `20,4 °C → 20°`/`69°`; os rótulos são `°C` e `°F`; o módulo não importa nem chama API ou storage.
- **Rastreabilidade:** FR-04; critérios FR-04; NFR-06, NFR-09.
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/temperature.ts`
- **Tipo:** Data

### T-03 — Implementar formatação localizada
- **ID:** T-03
- **Título:** Formatar datas no fuso da cidade
- **Descrição curta:** Formatar datas e horários em pt-BR sem converter as datas locais da previsão para o fuso do dispositivo.
- **Critérios de aceite:** para `2026-03-10` em `America/Sao_Paulo`, a função produz `10/03/2026`; datas permanecem no dia local da API ao serem formatadas; horários usam ciclo de 24 horas; testes Vitest não dependem do fuso configurado na máquina.
- **Rastreabilidade:** FR-03; critérios FR-03; NFR-06.
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/format.ts`
- **Tipo:** Data

### T-04 — Mapear códigos meteorológicos
- **ID:** T-04
- **Título:** Mapear códigos WMO para rótulos
- **Descrição curta:** Mapear códigos conhecidos para rótulos pt-BR e definir fallback para códigos desconhecidos.
- **Critérios de aceite:** código `0` retorna `Céu limpo`; cada código presente no mapa retorna seu rótulo pt-BR; código `999` retorna `Condição desconhecida` sem lançar exceção.
- **Rastreabilidade:** FR-02, FR-03; critérios FR-02; NFR-09.
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/weatherCodes.ts`
- **Tipo:** Data

## Entrega 2 — Services e persistência local

### T-05 — Criar serviço de preferências
- **ID:** T-05
- **Título:** Persistir cidade e unidade localmente
- **Descrição curta:** Implementar leitura e gravação da última cidade selecionada e da unidade no armazenamento local, sem servidor.
- **Critérios de aceite:** gravar e ler uma preferência recupera `lastCity` e `unit` sem perda dos campos; storage vazio retorna `lastCity: null` e `unit: 'celsius'`; JSON inválido, leitura ou gravação lançando exceção retorna defaults sem propagar erro; serviço não executa `fetch`.
- **Rastreabilidade:** FR-05; critérios FR-05; NFR-07.
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/services/preferencesStorage.ts`, `src/types/weather.ts`
- **Tipo:** Data

### T-06 — Implementar services Open-Meteo
- **ID:** T-06
- **Título:** Integrar geocoding e forecast
- **Descrição curta:** Implementar os endpoints, parâmetros, timeout de 10 s, validação de payload e mapeamento para tipos de domínio.
- **Critérios de aceite:** geocoding envia `name`, `count=5`, `language=pt`, `format=json` e query URL-encoded; forecast envia as coordenadas da cidade, os campos `current`/`daily` do plano, `forecast_days=5`, `timezone=auto` e unidades `celsius`/`kmh`/`mm`; cada resposta válida mapeia para os tipos de domínio; `null` permanece `null`; timeout aborta em 10 s; HTTP não-2xx, JSON inválido e timeout rejeitam com `WeatherServiceError`, nunca como lista vazia.
- **Rastreabilidade:** FR-01, FR-02, FR-03, FR-06; NFR-02, NFR-06, NFR-09, NFR-10.
- **Dependências:** T-01, T-04.
- **Arquivos prováveis:** `src/services/weatherService.ts`, `src/types/weather.ts`
- **Tipo:** Data

## Entrega 3 — Orquestração e estado

### T-10 — Implementar hook de clima
- **ID:** T-10
- **Título:** Orquestrar busca, seleção e forecast
- **Descrição curta:** Implementar no hook os estados independentes de busca e meteorologia, retry e proteção contra respostas obsoletas.
- **Critérios de aceite:** estados da busca percorrem os cinco valores previstos nos cenários correspondentes; zero resultados não chama forecast; um resultado seleciona automaticamente e múltiplos aguardam `selectCity`; falha isolada de current preserva forecast válido e vice-versa; após timeout, estado deixa `loading`; resposta da busca anterior não altera o estado após uma busca mais recente.
- **Rastreabilidade:** FR-01, FR-02, FR-03, FR-05, FR-06; critérios FR-01, FR-05, FR-06.
- **Dependências:** T-05, T-06.
- **Arquivos prováveis:** `src/hooks/useWeather.ts`
- **Tipo:** UI

## Entrega 4 — Interface

### T-12 — Implementar busca e seleção de cidades
- **ID:** T-12
- **Título:** Construir busca acessível de cidades
- **Descrição curta:** Conectar o campo de busca ao hook e apresentar resultados de geocodificação.
- **Critérios de aceite:** input trimado aceita 1–100 caracteres; vazio/espaços ou >100 não chama service e excesso mostra a mensagem definida; 0 resultados mostra `Nenhuma cidade encontrada`; até cinco resultados exibem nome/região/país quando disponíveis; seleção única e múltipla segue FR-01; loading/erro têm roles e labels acessíveis e controles operáveis por teclado.
- **Rastreabilidade:** FR-01, FR-06; critérios FR-01, FR-06; NFR-01, NFR-03, NFR-10.
- **Dependências:** T-10.
- **Arquivos prováveis:** `src/components/SearchBar.tsx`, `src/components/states/EmptyState.tsx`, `src/components/states/ErrorState.tsx`, `src/components/states/LoadingState.tsx`
- **Tipo:** UI

### T-13 — Apresentar clima atual e previsão
- **ID:** T-13
- **Título:** Construir painéis de clima e previsão
- **Descrição curta:** Renderizar os campos atuais e cinco datas com dados válidos e estados por campo/bloco.
- **Critérios de aceite:** clima identifica cidade, horário e unidade; previsão mostra exatamente cinco datas locais incluindo hoje; campos opcionais `null` aparecem como `Indisponível`; bloco atual inválido não oculta forecast válido e dia inválido não oculta os outros dias; observação com mais de 2 horas é marcada como desatualizada; condição desconhecida não quebra a renderização.
- **Rastreabilidade:** FR-02, FR-03, FR-06; critérios FR-02, FR-03; NFR-06, NFR-08, NFR-09.
- **Dependências:** T-01, T-03, T-04, T-10.
- **Arquivos prováveis:** `src/components/CurrentWeather.tsx`, `src/components/ForecastList.tsx`, `src/components/ForecastCard.tsx`
- **Tipo:** UI

### T-14 — Implementar alternância de unidade
- **ID:** T-14
- **Título:** Alternar Celsius e Fahrenheit
- **Descrição curta:** Criar controle de unidade e conectá-lo ao estado da aplicação e às preferências locais.
- **Critérios de aceite:** selecionar cada unidade atualiza atual, sensação térmica e mínimas/máximas com arredondamento definido; cidade/datas permanecem iguais; spy de `fetch` confirma zero chamadas causadas pelo toggle; reload restaura a última unidade se storage estiver disponível.
- **Rastreabilidade:** FR-04, FR-05; critérios FR-04, FR-05; NFR-06, NFR-07.
- **Dependências:** T-02, T-05, T-10.
- **Arquivos prováveis:** `src/components/UnitToggle.tsx`, `src/App.tsx`
- **Tipo:** UI

## Entrega 5 — Integração da aplicação

### T-15 — Compor a aplicação
- **ID:** T-15
- **Título:** Integrar fluxos e estados na página
- **Descrição curta:** Conectar hook, busca, painel meteorológico, unidade e estados de carregamento/erro/vazio no fluxo principal.
- **Critérios de aceite:** em renderização integrada, a pessoa consegue completar busca, seleção, consulta, alternância e retry; reload restaura a cidade, refaz forecast e mantém unidade; storage indisponível não impede busca; status vazio e erro não são confundidos.
- **Rastreabilidade:** FR-01 a FR-06; NFR-07.
- **Dependências:** T-10, T-12, T-13, T-14.
- **Arquivos prováveis:** `src/App.tsx`, `src/components/states/`
- **Tipo:** UI

## Entrega 6 — Testes

### T-07 — Testar conversão Celsius/Fahrenheit
- **ID:** T-07
- **Título:** Testar conversão Celsius/Fahrenheit
- **Descrição curta:** Criar testes unitários exclusivos para conversão, arredondamento e rótulos de unidade.
- **Critérios de aceite:** Vitest verifica `0 °C → 32 °F`, `100 °C → 212 °F`, `-40 °C → -40 °F`, `20,4 °C → 20°` e `20,4 °C → 69°` em Fahrenheit, além dos rótulos `°C`/`°F`; `pnpm test -- tests/unit/temperature.test.ts` passa sem rede.
- **Rastreabilidade:** FR-04; NFR-06, NFR-09.
- **Dependências:** T-02, T-15.
- **Arquivos prováveis:** `tests/unit/temperature.test.ts`
- **Tipo:** Test

### T-22 — Testar formatação e códigos meteorológicos
- **ID:** T-22
- **Título:** Cobrir funções puras auxiliares
- **Descrição curta:** Criar testes unitários determinísticos para datas/fuso e códigos WMO, fora da cobertura de conversão de unidade.
- **Critérios de aceite:** Vitest verifica formatação de `2026-03-10` em `America/Sao_Paulo` como `10/03/2026`, horário em 24 horas, pelo menos um código WMO conhecido e código `999` como `Condição desconhecida`; `pnpm test -- tests/unit/format.test.ts tests/unit/weatherCodes.test.ts` passa sem rede nem relógio do sistema.
- **Rastreabilidade:** FR-02, FR-03; NFR-06, NFR-09.
- **Dependências:** T-03, T-04, T-15.
- **Arquivos prováveis:** `tests/unit/format.test.ts`, `tests/unit/weatherCodes.test.ts`
- **Tipo:** Test

### T-08 — Testar services com fetch mockado
- **ID:** T-08
- **Título:** Cobrir contratos e falhas das APIs
- **Descrição curta:** Testar requisições e mapeamento sem acessar Open-Meteo.
- **Critérios de aceite:** testes de `weatherService` verificam endpoints e parâmetros, coordenadas, `count=5`, encoding de `São José` e unidades; cenários cobrem zero resultados, resposta válida/complementar ausente/essencial ausente, `null`, JSON inválido, HTTP 429/500, rejeição de rede e timeout; `null` em probabilidade não é transformado em `0`; o teste de timeout termina em 10 s de relógio falso.
- **Rastreabilidade:** FR-01, FR-02, FR-03, FR-06; NFR-09, NFR-10.
- **Dependências:** T-06, T-15.
- **Arquivos prováveis:** `tests/unit/weatherService.test.ts`
- **Tipo:** Test

### T-09 — Testar preferências locais
- **ID:** T-09
- **Título:** Cobrir persistência e fallback de storage
- **Descrição curta:** Verificar comportamento de preferências em primeira execução e quando o storage falha.
- **Critérios de aceite:** testes Vitest verificam defaults, round-trip de cidade/unidade, JSON inválido e exceções de leitura/gravação; em todos os cenários de storage indisponível, a função retorna fallback sem lançar exceção e `unit` é Celsius.
- **Rastreabilidade:** FR-05; critérios FR-05; NFR-07.
- **Dependências:** T-05, T-15.
- **Arquivos prováveis:** `tests/unit/preferencesStorage.test.ts`
- **Tipo:** Test

### T-11 — Testar hook e transições de estado
- **ID:** T-11
- **Título:** Cobrir orquestração do hook
- **Descrição curta:** Testar transições do hook com services controlados.
- **Critérios de aceite:** testes do hook cobrem zero/um/múltiplos resultados, seleção, loading, sucesso, erro, retry, resposta parcial, storage indisponível e resposta obsoleta; cada cenário verifica status, dados e erro esperados; services são mockados e não há chamadas de rede.
- **Rastreabilidade:** FR-01, FR-02, FR-03, FR-05, FR-06.
- **Dependências:** T-10, T-08, T-09, T-15.
- **Arquivos prováveis:** `tests/unit/useWeather.test.ts`
- **Tipo:** Test

### T-17 — Testar componentes e estados da UI
- **ID:** T-17
- **Título:** Testar estados dos componentes
- **Descrição curta:** Verificar estados loading, erro, vazio e sucesso dos componentes com Testing Library.
- **Critérios de aceite:** com resposta pendente, componente mostra loading; com zero cidades, mostra `Nenhuma cidade encontrada`; com falha, mostra mensagem de erro e ação de retry; com fixture válida, mostra cidade e dados; resposta parcial marca campos ausentes como `Indisponível`. Busca, resultados e retry são localizáveis por role/accessible name e operáveis por teclado; toggle não chama service.
- **Rastreabilidade:** FR-01 a FR-06; NFR-03, NFR-06, NFR-09.
- **Dependências:** T-12, T-13, T-14, T-15.
- **Arquivos prováveis:** `tests/unit/SearchBar.test.tsx`, `tests/unit/App.test.tsx`, novos testes de `CurrentWeather`, `ForecastList` e `UnitToggle` se necessário.
- **Tipo:** Test

### T-18 — Cobrir jornadas E2E
- **ID:** T-18
- **Título:** Validar fluxos principais com Playwright
- **Descrição curta:** Simular Open-Meteo e validar jornadas completas no navegador.
- **Critérios de aceite:** Playwright completa busca → seleção → clima atual/previsão → alternância C/F com fixtures; também cobre reload, vazio, falha e retry; execução CI não faz chamadas à Open-Meteo; fluxo principal passa em viewport mobile de 320 px e 375 px e desktop de 1280 px, sem rolagem horizontal no mobile.
- **Rastreabilidade:** FR-01 a FR-06; NFR-01, NFR-03, NFR-05, NFR-06.
- **Dependências:** T-15, T-16, T-17.
- **Arquivos prováveis:** `tests/e2e/weather.spec.ts`, `playwright.config.ts`
- **Tipo:** Test

## Entrega 7 — Hardening e validação de produção

### T-16 — Aplicar responsividade e tema do projeto
- **ID:** T-16
- **Título:** Atender requisitos visuais e responsivos
- **Descrição curta:** Aplicar o tema Tailwind dark glassmorphism e ajustar fluxos para mobile e desktop, preservando acessibilidade.
- **Critérios de aceite:** em cada viewport 320, 375, 768, 1280 e 1920 px, os fluxos principais não têm rolagem horizontal; cada alvo de toque principal mede ≥44 × 44 CSS px; busca, seleção, unidade e retry completam-se por teclado; tema usa Tailwind configurado para dark glassmorphism.
- **Rastreabilidade:** NFR-01, NFR-03, NFR-05.
- **Dependências:** T-15.
- **Arquivos prováveis:** `src/styles/index.css`, `tailwind.config.js`, `src/components/`
- **Tipo:** UI

### T-19 — Validar Open-Meteo antes do lançamento
- **ID:** T-19
- **Título:** Confirmar contrato e condições do provider
- **Descrição curta:** Validar cobertura, disponibilidade dos campos, limites, termos e chamadas diretas do browser.
- **Critérios de aceite:** registro da validação lista campos essenciais/complementares e resultado por campo; chamada de navegador a cada endpoint retorna sem erro de CORS; limites e termos aplicáveis são registrados; cada campo ausente/termo incompatível gera decisão documentada e atualização do plano/spec antes do release.
- **Rastreabilidade:** FR-01 a FR-03; NFR-02, NFR-07, NFR-10; Open Question 1.
- **Dependências:** T-06, T-08, T-18.
- **Arquivos prováveis:** `plans/weather-app-plan.md` somente se decisões precisarem mudar; sem alteração de código se validação passar.
- **Tipo:** Infra

### T-20 — Validar requisitos não funcionais
- **ID:** T-20
- **Título:** Medir desempenho, compatibilidade e acessibilidade
- **Descrição curta:** Validar os critérios de desempenho, browsers e acessibilidade definidos na spec.
- **Critérios de aceite:** relatório registra p95 de busca e consulta sob 10 Mbps down, 2 Mbps up e RTT ≤100 ms e indica pass/fail em 3 s; checklist registra execução em cada navegador/versão da matriz NFR-05; auditoria automatizada registra zero violações críticas/altas; busca, seleção, toggle e retry são concluídos por teclado.
- **Rastreabilidade:** NFR-02, NFR-03, NFR-05; Open Questions 2.
- **Dependências:** T-16, T-18.
- **Arquivos prováveis:** `tests/e2e/`, `playwright.config.ts`, `package.json` se uma ferramenta de auditoria for necessária.
- **Tipo:** Test

### T-21 — Configurar monitoramento de disponibilidade
- **ID:** T-21
- **Título:** Monitorar aplicação e provider separadamente
- **Descrição curta:** Configurar verificações sintéticas do shell da aplicação e observação separada da API, sem assumir um fornecedor de hospedagem específico neste backlog.
- **Critérios de aceite:** verificação sintética do shell executa a cada 5 minutos; relatório mensal calcula disponibilidade como verificações bem-sucedidas / verificações programadas e mostra pass/fail contra 99,5%; erros e latência da Open-Meteo são métricas separadas; procedimento de alerta e responsável estão documentados.
- **Rastreabilidade:** NFR-04; Open Questions 2.
- **Dependências:** T-15, T-19, T-20.
- **Arquivos prováveis:** configuração de hospedagem/monitoramento (a definir), `.github/workflows/` se aplicável, documentação operacional existente.
- **Tipo:** Infra

## Prioridade, tamanho e fatias de entrega

**Prioridade:** P0 = necessária para a primeira fatia funcional demonstrável; P1 = necessária para completar a v1 ou liberar produção, mas pode vir após a primeira fatia; P2 = pode ser adiada sem descumprir os requisitos atuais. Não há tarefas P2: todas as tarefas do backlog atendem escopo ou gates de lançamento da spec.

**Tamanho relativo:** P = pequena e localizada; M = esforço moderado ou múltiplos estados/arquivos; G = ampla ou incerta, candidata a ser dividida antes de entrar em uma iteração.

| Tarefa | Prioridade | Tamanho |
|---|---:|---:|
| T-01 — Tipos de domínio | P0 | P |
| T-02 — Conversão de temperatura | P1 | P |
| T-03 — Formatação localizada | P0 | P |
| T-04 — Códigos meteorológicos | P0 | P |
| T-05 — Preferências locais | P0 | P |
| T-06 — Services Open-Meteo | P0 | G |
| T-07 — Teste de conversão | P1 | P |
| T-08 — Testes dos services | P0 | M |
| T-09 — Testes de preferências | P0 | P |
| T-10 — Hook de clima | P0 | M |
| T-11 — Testes do hook | P0 | M |
| T-12 — Busca e seleção | P0 | M |
| T-13 — Clima atual e previsão | P0 | M |
| T-14 — Alternância de unidade | P1 | P |
| T-15 — Composição da aplicação | P0 | M |
| T-16 — Responsividade e tema | P1 | M |
| T-17 — Testes dos estados de UI | P1 | M |
| T-18 — Jornadas E2E | P1 | M |
| T-19 — Validação Open-Meteo | P1 | M |
| T-20 — Validação de NFRs | P1 | G |
| T-21 — Monitoramento de disponibilidade | P1 | M |
| T-22 — Testes de formatação/códigos | P0 | P |

**Fatias verticais sugeridas:**

1. **Clima visível:** T-01, T-03, T-04, T-05, T-06, T-10, T-12, T-13 e T-15. Entrega busca de cidade, clima atual e cinco dias integrados; depois valide a fatia com T-08, T-09, T-11 e T-22. Este é o primeiro incremento utilizável e visível.
2. **Preferência e unidades:** T-02 e T-14, seguidas por T-07 e T-17. Acrescenta alternância C/F, restauração da unidade e testes de interação; T-05 já habilita persistência local da cidade na primeira fatia.
3. **Pronto para produção:** T-16, T-18, T-19, T-20 e T-21. Fecha responsividade mobile, E2E do fluxo completo, contrato/termos do provider, validação dos NFRs e monitoramento. T-18 depende de T-16 para testar o layout final nos viewports móveis.

T-06 e T-20 são G: antes de estimar uma iteração, considerar separar geocoding de forecast em T-06 e dividir a validação de NFRs por desempenho, compatibilidade e acessibilidade em T-20.

## Rastreabilidade de implementação funcional

| Requisito funcional | Tarefas de implementação | Cobertura |
|---|---|---|
| FR-01 — Buscar cidade | T-06, T-10, T-12, T-15 | Coberto: integração geocoding, orquestração, busca/seleção e composição da tela. |
| FR-02 — Consultar clima atual | T-06, T-10, T-13, T-15 | Coberto: forecast, estado, apresentação dos dados e integração. |
| FR-03 — Consultar previsão de cinco dias | T-06, T-10, T-13, T-15 | Coberto: forecast, estado, lista/cartões e integração. |
| FR-04 — Alternar unidade de temperatura | T-02, T-14, T-15 | Coberto: conversão pura, controle de unidade e integração. |
| FR-05 — Restaurar preferências locais | T-05, T-10, T-14, T-15 | Coberto: storage local, inicialização do estado, preferência de unidade e composição da aplicação. |
| FR-06 — Comunicar estados da consulta | T-06, T-10, T-12, T-13, T-15 | Coberto: classificação de erros, estados no hook, feedback visual e integração. |

Todos os requisitos funcionais FR-01 a FR-06 têm pelo menos uma tarefa de implementação. Nenhum requisito funcional está sem tarefa correspondente.

## Rastreabilidade geral

| Requisito da spec | Tarefas |
|---|---|
| FR-01 — Buscar cidade | T-06, T-08, T-10, T-12, T-17, T-18 |
| FR-02 — Consultar clima atual | T-06, T-08, T-10, T-13, T-17, T-18, T-22 |
| FR-03 — Consultar previsão de cinco dias | T-06, T-08, T-10, T-13, T-17, T-18, T-22 |
| FR-04 — Alternar unidade | T-02, T-07, T-14, T-17, T-18 |
| FR-05 — Restaurar preferências locais | T-05, T-09, T-10, T-14, T-15, T-17, T-18 |
| FR-06 — Estados e falhas | T-06, T-08, T-10, T-11, T-12, T-13, T-17, T-18 |
| NFR-01 — Responsividade | T-16, T-18 |
| NFR-02 — Desempenho | T-20 |
| NFR-03 — Acessibilidade | T-12, T-16, T-17, T-18, T-20 |
| NFR-04 — Disponibilidade | T-21 |
| NFR-05 — Compatibilidade | T-18, T-20 |
| NFR-06 — Localização | T-03, T-13, T-17, T-18, T-22 |
| NFR-07 — Privacidade | T-05, T-09, T-15, T-19 |
| NFR-08 — Atualidade dos dados | T-06, T-10, T-13, T-19 |
| NFR-09 — Integridade de apresentação | T-06, T-08, T-13, T-17, T-22 |
| NFR-10 — Segurança de transporte e entrada | T-06, T-08, T-12, T-19 |
