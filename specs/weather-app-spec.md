# Weather App — Especificação do Produto

## Overview

Aplicação web responsiva para consultar clima atual e previsão de cinco dias de uma cidade escolhida por busca manual. A interface será em português do Brasil, terá Celsius como unidade inicial e permitirá alternar para Fahrenheit. A primeira versão não exige autenticação nem armazena dados em servidor.

**Públicos preliminares:**

- **Pessoa que decide a rotina do dia:** consulta o clima atual para se preparar antes de sair.
- **Pessoa que planeja compromissos ou viagens:** consulta a previsão para organizar os próximos dias.

**Fonte de dados prevista:** Open-Meteo para geocodificação e dados meteorológicos, sem API key, sujeito à validação de cobertura e termos de uso.

**Critério inicial de sucesso:** em teste moderado com 20 participantes (10 de cada perfil preliminar), pelo menos 18 devem concluir sem ajuda: pesquisar e selecionar uma cidade, localizar o clima atual e identificar a previsão de um dia específico. Tratar como baseline de usabilidade, não como métrica de adoção.

## Functional Requirements

- **FR-01 — Buscar cidade:** aceitar buscas de 1 a 100 caracteres após remover espaços nas extremidades e pesquisar por envio explícito. Não enviar consulta vazia. Exibir até cinco resultados com nome, região e país quando disponíveis; selecionar automaticamente apenas quando houver um resultado. Para múltiplos resultados, exigir seleção explícita antes de consultar o clima.
- **FR-02 — Consultar clima atual:** solicitar temperatura, código de condição, horário da observação, sensação térmica, umidade, vento e precipitação. Temperatura, código e horário são essenciais; os demais campos são complementares. Campo complementar ausente aparece como `Indisponível`; ausência de campo essencial invalida o bloco atual.
- **FR-03 — Consultar previsão de cinco dias:** solicitar cinco datas locais consecutivas, incluindo hoje, com condição e temperaturas mínima/máxima. Probabilidade de precipitação e vento máximo são complementares; valor ausente ou `null` aparece como `Indisponível`, nunca como zero. Ausência de data, condição ou temperaturas mínima/máxima invalida aquele dia.
- **FR-04 — Alternar unidade de temperatura:** permitir alternar entre Celsius e Fahrenheit e atualizar todas as temperaturas exibidas. Converter a partir do valor de origem em Celsius e arredondar a temperatura apresentada para o inteiro mais próximo; mostrar `°C` ou `°F` junto aos valores.
- **FR-05 — Restaurar preferências locais:** salvar a última cidade selecionada (identificador, coordenadas e rótulo) e unidade no armazenamento local do mesmo navegador. Ao reabrir, restaurar a cidade e iniciar nova consulta; não sincronizar preferências em servidor.
- **FR-06 — Comunicar estados da consulta:** distinguir estados `idle`, `loading`, `success`, `empty` e `error`. Limitar cada requisição a 10 segundos. Em erro de rede, HTTP ou timeout, encerrar o carregamento, informar a falha e oferecer nova tentativa manual, sem retry automático.

## User Stories

- **US-01 — Consulta rápida:** Como pessoa que decide a rotina do dia, quero pesquisar minha cidade e ver o clima atual para decidir como me preparar.
- **US-02 — Planejamento:** Como pessoa que planeja compromissos ou viagens, quero consultar a previsão de hoje e dos quatro dias seguintes para escolher quando realizar uma atividade.
- **US-03 — Escolha correta da cidade:** Como pessoa que planeja compromissos ou viagens, quero ver região e país nos resultados de cidades homônimas para consultar o destino certo.
- **US-04 — Unidade familiar:** Como pessoa que decide a rotina do dia, quero alternar entre Celsius e Fahrenheit para interpretar as temperaturas na unidade que prefiro.
- **US-05 — Retomar consulta:** Como pessoa que decide a rotina do dia, quero que o navegador restaure minha última cidade e unidade para evitar configurar a consulta novamente.
- **US-06 — Recuperação de falha:** Como pessoa que decide a rotina do dia, quero receber uma explicação e poder tentar novamente quando a consulta falhar para saber como me preparar.

## Acceptance Criteria

Todos os critérios abaixo usam o formato Given/When/Then. Para testes automatizados, a data do sistema e as respostas de geocodificação e meteorologia devem ser controladas por fixtures; os testes não devem depender de chamadas reais à API.

### FR-01 — Buscar cidade

- **Given** o campo contém apenas espaços, **When** a pessoa usuária envia a busca, **Then** nenhum pedido de geocodificação é feito e o campo continua disponível.
- **Given** o campo contém mais de 100 caracteres após remover espaços nas extremidades, **When** a pessoa usuária envia a busca, **Then** nenhum pedido de geocodificação é feito e a interface informa `Use no máximo 100 caracteres`.
- **Given** o campo contém `São José`, **When** a pessoa usuária envia a busca, **Then** o texto acentuado é codificado com segurança na requisição e a resposta é apresentada sem corromper os caracteres.
- **Given** a geocodificação retorna exatamente um resultado válido, **When** a busca termina, **Then** esse resultado é selecionado e o pedido meteorológico usa suas coordenadas.
- **Given** a geocodificação retorna `Springfield, Illinois, Estados Unidos` e `Springfield, Massachusetts, Estados Unidos`, **When** a busca termina, **Then** ambos aparecem com região e país e nenhum pedido meteorológico é feito até a seleção explícita.
- **Given** há múltiplos resultados visíveis, **When** a pessoa usuária seleciona um resultado, **Then** a cidade selecionada é identificada e o pedido meteorológico usa exatamente as coordenadas desse resultado.
- **Given** uma busca está em andamento, **When** uma busca mais recente é enviada antes da primeira terminar, **Then** somente os resultados da busca mais recente podem atualizar a interface.

### FR-02 — Consultar clima atual

- **Given** a cidade selecionada tem resposta atual válida com temperatura `20 °C`, código meteorológico `0`, horário da observação, sensação térmica `18 °C`, umidade `55%`, vento `14 km/h` e precipitação `0 mm`, **When** a consulta termina, **Then** a interface identifica a cidade e exibe todos os valores e unidades, com condição `Céu limpo`.
- **Given** a resposta atual não contém um campo complementar, **When** o clima atual é apresentado, **Then** os demais campos válidos são exibidos e o campo ausente mostra `Indisponível`.
- **Given** a resposta atual não contém temperatura, código meteorológico ou horário da observação, **When** a resposta é processada, **Then** o bloco de clima atual mostra erro recuperável e não apresenta valores parciais como clima atual válido.

### FR-03 — Consultar previsão de cinco dias

- **Given** a data local da cidade é `10/03/2026` e a fonte retorna cinco datas, **When** a previsão termina de carregar, **Then** a interface apresenta exatamente `10/03/2026` a `14/03/2026`, nessa ordem.
- **Given** cada data contém código meteorológico e temperaturas mínima/máxima, **When** os cinco dias são exibidos, **Then** cada dia mostra condição, mínima e máxima com unidade identificada.
- **Given** probabilidade de precipitação ou vento máximo não está presente ou tem valor `null`, **When** o dia é exibido, **Then** o campo correspondente mostra `Indisponível`, nunca `0` por substituição.
- **Given** uma data não contém código meteorológico ou temperatura mínima/máxima, **When** a previsão é apresentada, **Then** essa data é marcada como indisponível e as demais datas válidas permanecem visíveis.

### FR-04 — Alternar unidade de temperatura

- **Given** clima atual e previsão exibem `20 °C` e `0 °C`, **When** a pessoa usuária seleciona Fahrenheit, **Then** todos os valores de temperatura passam a `68°` e `32°`, os rótulos passam a `°F` e cidade/datas não mudam.
- **Given** o valor de origem é `20,4 °C`, **When** a unidade é Celsius, **Then** a tela mostra `20°`; **When** a unidade é Fahrenheit, **Then** a tela mostra `69°` com rótulo `°F`.
- **Given** a unidade foi alternada de Celsius para Fahrenheit e de volta, **When** os dados são renderizados, **Then** o valor em Celsius volta a ser o mesmo valor arredondado da primeira exibição, sem erro acumulado.

### FR-05 — Restaurar preferências locais

- **Given** a pessoa usuária selecionou `Porto, Portugal` e Fahrenheit, **When** reabre a aplicação no mesmo navegador com armazenamento local disponível, **Then** a cidade é restaurada e a consulta de clima é refeita; temperaturas aparecem em Fahrenheit.
- **Given** não há preferências salvas, **When** a aplicação é aberta, **Then** a busca está disponível, nenhuma cidade é selecionada e a unidade inicial é Celsius (`°C`).
- **Given** o navegador bloqueia ou falha ao gravar armazenamento local, **When** a aplicação é aberta ou uma cidade é pesquisada, **Then** a aplicação não falha, mantém a busca utilizável, usa Celsius e não envia preferências a um endpoint de servidor.

### FR-06 — Estados e falhas da consulta

- **Given** uma busca ou consulta está pendente e a resposta da API está retida pelo teste, **When** a pessoa usuária inicia a ação, **Then** a interface exibe o estado de carregamento antes da resposta ser liberada.
- **Given** a geocodificação retorna uma lista vazia, **When** a resposta é recebida, **Then** a interface informa `Nenhuma cidade encontrada` e mantém a busca disponível.
- **Given** uma requisição não responde em 10 segundos, **When** o timeout é atingido, **Then** o carregamento termina, a interface informa `A requisição demorou demais. Tente novamente.` e mostra `Tentar novamente`.
- **Given** geocodificação ou consulta meteorológica retorna erro HTTP ou falha de rede, **When** a falha é recebida, **Then** a interface mostra mensagem de indisponibilidade adequada à ação e `Tentar novamente`; a falha nunca é apresentada como lista vazia.
- **Given** a primeira tentativa falhou e a ação de nova tentativa está visível, **When** a pessoa usuária aciona `Tentar novamente` e a resposta seguinte é válida, **Then** a interface remove o erro e mostra os dados da cidade selecionada.

## Non-Functional Requirements

- **NFR-01 — Responsividade:** validar viewports de 320, 375, 768, 1280 e 1920 px. Fluxos principais não podem ter rolagem horizontal; alvos de toque devem medir pelo menos 44 × 44 CSS px.
- **NFR-02 — Desempenho:** para requisições bem-sucedidas, o percentil 95 do tempo entre envio da busca/seleção da cidade e renderização dos resultados deve ser ≤ 3 s, incluindo latência da API. Medir com 10 Mbps de download, 2 Mbps de upload e RTT ≤ 100 ms; reportar falhas e timeouts separadamente.
- **NFR-03 — Acessibilidade:** atender ao WCAG 2.2 nível AA nos fluxos de busca, seleção, consulta, alternância de unidade e recuperação de erro. Auditoria automatizada não pode apontar violações críticas/altas; os fluxos devem ser completáveis por teclado.
- **NFR-04 — Disponibilidade:** disponibilidade mensal do shell da aplicação ≥ 99,5%, medida por verificações sintéticas a cada 5 minutos. Medir e reportar separadamente erros e latência da API meteorológica; falha da API deve produzir o estado de erro definido, não indisponibilidade silenciosa.
- **NFR-05 — Compatibilidade:** suportar as duas versões principais estáveis mais recentes de Chrome, Firefox, Edge e Safari desktop; Safari nas versões atual e anterior do iOS; Chrome nas versões atual e anterior do Android. Atualizar a matriz de teste ao menos trimestralmente.
- **NFR-06 — Localização:** apresentar interface em pt-BR, datas DD/MM/AAAA, horas em 24 horas, temperatura em °C/°F, vento em km/h e precipitação em mm. Datas e dias da previsão usam o fuso da cidade selecionada.
- **NFR-07 — Privacidade:** não exigir conta nem armazenar preferências no servidor. A busca envia o texto da cidade e, após seleção, suas coordenadas à Open-Meteo; não enviar identificadores pessoais. Manter apenas a última cidade e unidade no armazenamento local do navegador.
- **NFR-08 — Atualidade dos dados:** não usar cache meteorológico offline. Exibir o horário de observação retornado pela fonte; se a observação atual tiver mais de 2 horas, identificá-la como desatualizada.
- **NFR-09 — Integridade de apresentação:** identificar a cidade consultada e as unidades; não converter `null` ou campo ausente em zero. Códigos meteorológicos desconhecidos devem ser apresentados como `Condição desconhecida`.
- **NFR-10 — Segurança de transporte e entrada:** usar HTTPS para chamadas externas, codificar parâmetros de busca como URL e renderizar texto retornado pela fonte como texto, nunca como HTML executável.

## Edge Cases

- **Busca vazia ou composta apenas por espaços:** não enviar consulta e manter orientação para informar uma cidade; acima de 100 caracteres, bloquear o envio e informar o limite.
- **Nenhum resultado de geocodificação:** informar que nenhuma cidade foi encontrada e permitir editar a busca.
- **Cidades homônimas:** listar resultados distinguíveis por cidade, estado/região e país; não escolher automaticamente um resultado ambíguo.
- **Caracteres especiais ou acentuados no nome da cidade:** preservar caracteres Unicode na interface e codificar o parâmetro da requisição; não interpretar entrada ou resposta como HTML.
- **Falha de rede, HTTP 4xx/5xx ou limite 429:** encerrar a requisição, mostrar mensagem de erro e nova tentativa manual; não tratar falha como busca vazia.
- **Timeout:** abortar a requisição após 10 segundos, encerrar o carregamento e permitir nova tentativa manual, sem retry automático.
- **Resposta parcial:** manter os campos válidos; campo complementar ausente ou `null` recebe `Indisponível`; ausência de temperatura/condição/data essencial invalida somente o bloco correspondente.
- **Código meteorológico desconhecido:** exibir `Condição desconhecida` sem interromper os demais dados.
- **Resposta da fonte para local ou período inválido:** não exibir dados pertencentes a outra cidade ou data; mostrar erro recuperável.
- **Mudança de data ou fuso horário:** compor as cinco datas no fuso local da cidade, inclusive em transições de horário sazonal quando aplicáveis.
- **Armazenamento local apagado, bloqueado ou indisponível:** iniciar com Celsius e permitir busca manual normalmente.
- **Conversão repetida entre unidades:** converter a partir do valor de origem para evitar acumular erros de arredondamento.
- **Nova consulta enquanto outra está em andamento:** ao concluir, apresentar os dados correspondentes à seleção mais recente, sem sobrescrever a cidade atual com uma resposta antiga.

## Assumptions

- O produto é uma aplicação web responsiva; não há aplicativo nativo nesta versão.
- A pessoa usuária escolhe a cidade por busca manual; geolocalização não será solicitada.
- Há conexão com a internet para obter dados atualizados; não há modo offline nem cache meteorológico.
- Open-Meteo fornece geocodificação, clima atual e previsão para as cidades suportadas; disponibilidade de campos específicos será validada.
- A previsão é diária, incluindo a data local de hoje e os quatro dias seguintes.
- Celsius é a unidade inicial; Fahrenheit também estará disponível. Vento será apresentado em km/h e precipitação em mm.
- Última cidade e unidade são preferências locais do mesmo navegador e serão restauradas no próximo acesso enquanto o armazenamento existir. Não há autenticação, perfil ou sincronização entre dispositivos.
- Os dados meteorológicos são estimativas e não garantias de condições futuras.
- As metas de desempenho, disponibilidade, compatibilidade e sucesso são os critérios iniciais de lançamento definidos nesta spec.

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Indisponibilidade, latência ou limitação de requisições da fonte externa | Média | Alto | Validar limites, cobertura e termos; tratar falhas, permitir nova tentativa e monitorar a fonte separadamente da aplicação. |
| Fonte externa não fornece campo essencial ou altera o contrato | Média | Alto | Validar o contrato antes do lançamento; validar respostas em runtime e falhar explicitamente se temperatura, condição ou data essencial estiver ausente. |
| Seleção de cidade homônima ou localização incorreta | Média | Alto | Exibir estado/região e país; exigir seleção explícita quando houver ambiguidade. |
| Dados desatualizados ou interpretados no fuso incorreto | Média | Alto | Usar datas locais da cidade, mostrar horário de referência disponível e testar viradas de dia e de fuso. |
| Erro de conversão ou arredondamento de temperatura | Baixa | Alto | Converter a partir do valor original e validar conversões com casos de teste conhecidos. |
| Interface difícil de usar em telas pequenas ou com tecnologia assistiva | Média | Médio | Testar tamanhos móveis, teclado, leitor de tela e critérios WCAG 2.2 AA. |
| Público e critério de sucesso não confirmados | Média | Médio | Validar as personas preliminares e o teste de usabilidade antes de considerar a meta de 90% definitiva. |

## Out of Scope

- Aplicativos nativos para iOS ou Android.
- Geolocalização automática ou solicitação de permissão de localização.
- Login, contas, perfis, sincronização ou persistência de dados meteorológicos/preferências em servidor.
- Favoritos, histórico de várias cidades ou compartilhamento de locais.
- Alertas, notificações push ou recomendações automatizadas de vestuário/atividades.
- Funcionamento offline, cache meteorológico e visualização de dados antigos como atuais.
- Previsão horária, histórico climático e previsões para além de cinco dias.
- Suporte a idiomas além de português do Brasil nesta versão.

## Open Questions

As decisões abaixo são gates de lançamento; os padrões de produto e comportamentos de fallback já estão definidos nesta spec:

1. Confirmar cobertura, termos de uso e limites de requisição da Open-Meteo para lançamento e volume previsto.
2. Validar com stakeholders os SLOs de performance/disponibilidade e o perfil de rede definido para os testes.
3. Validar os perfis preliminares e o protocolo do teste antes de usar a métrica de 18/20 como indicador de sucesso.
