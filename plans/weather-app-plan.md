# Weather App — Plano Técnico

## Architecture

Aplicação cliente-only, construída como SPA React servida pelo Vite. Não haverá backend, autenticação ou persistência em servidor na primeira versão.

Responsabilidades em camadas:

- **Apresentação (`src/components/`, `src/App.tsx`):** busca, resultados de cidade, clima atual, previsão, unidade e estados visuais.
- **Orquestração (`src/hooks/useWeather.ts`):** fluxo de busca/seleção, carregamento, cancelamento de respostas obsoletas, retry manual e exposição do estado para a UI.
- **Integrações (`src/services/`):** chamadas HTTP para geocodificação e previsão; leitura/escrita de preferências locais em um serviço pequeno.
- **Domínio (`src/types/`, `src/lib/`):** modelos normalizados, conversão/formatação e mapeamento de códigos meteorológicos.

As chamadas a Open-Meteo serão feitas pelo navegador via HTTPS e `fetch`, sem chave. Toda resposta externa será validada e mapeada para tipos do domínio antes de chegar aos componentes. Uma falha em dados atuais não deve descartar uma previsão válida, nem o inverso.

## Tech Stack

- **UI:** React 19 + TypeScript strict, conforme dependências existentes.
- **Build e desenvolvimento:** Vite.
- **Estilo:** Tailwind CSS 3, conforme a configuração existente.
- **HTTP:** `fetch` nativo, `URLSearchParams`, `AbortController` e timeout de 10 segundos; sem cliente HTTP adicional.
- **Estado:** hooks React locais; sem Redux, Zustand ou cache de servidor.
- **Qualidade:** Biome, Vitest + Testing Library e Playwright, já presentes no projeto.
- **Gerenciador:** pnpm, conforme `package.json`.

Não adicionar dependências para estado, HTTP ou datas sem uma necessidade comprovada. Usar `Intl.DateTimeFormat` para apresentação localizada e manter datas de previsão no formato ISO local recebido da API até a apresentação.

## Project Structure

Manter a estrutura e os componentes existentes. Ajustes esperados:

- `src/App.tsx` — compõe fluxos e mantém preferência de unidade no nível da aplicação.
- `src/components/SearchBar.tsx` — valida entrada, envia busca e permite seleção explícita quando há múltiplos resultados.
- `src/components/CurrentWeather.tsx` — apresenta dados atuais e estado indisponível por campo.
- `src/components/ForecastList.tsx` e `src/components/ForecastCard.tsx` — apresentam as cinco datas locais.
- `src/components/UnitToggle.tsx` — alterna somente a apresentação das temperaturas.
- `src/components/states/` — estados vazio, loading e erro já separados.
- `src/hooks/useWeather.ts` — coordena estados separados de geocodificação e clima; ignora/cancela respostas antigas.
- `src/services/weatherService.ts` — chamadas Open-Meteo, timeout, validação do payload e mapeamento DTO → domínio.
- `src/services/preferencesStorage.ts` — novo módulo pequeno para ler/gravar última cidade e unidade no armazenamento local com `try/catch`.
- `src/types/weather.ts` — contratos de domínio abaixo; tipos do provider ficam privados ao serviço.
- `src/lib/temperature.ts`, `src/lib/format.ts`, `src/lib/weatherCodes.ts` — manter funções puras de conversão, formatação e códigos.
- `tests/unit/` e `tests/e2e/` — ampliar a cobertura seguindo a divisão atual.

## Data Model

Contratos conceituais TypeScript; são a fronteira entre serviço e UI, não implementação final:

```ts
type Unit = 'celsius' | 'fahrenheit';
type RequestStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';
type WeatherErrorKind = 'network' | 'timeout' | 'http' | 'invalid-response';

interface City {
  id: number;
  name: string;
  admin1: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

interface CurrentWeather {
  observedAt: string;
  temperatureC: number;
  weatherCode: number;
  apparentTemperatureC: number | null;
  humidityPercent: number | null;
  windKmh: number | null;
  precipitationMm: number | null;
}

type ForecastDay =
  | {
      status: 'available';
      date: string;
      weatherCode: number;
      minTemperatureC: number;
      maxTemperatureC: number;
      precipitationProbabilityPercent: number | null;
      maxWindKmh: number | null;
    }
  | { status: 'unavailable'; date: string };

interface WeatherData {
  city: City;
  timezone: string;
  current: CurrentWeather | null;
  forecast: ForecastDay[];
  errors: {
    current?: WeatherError;
    forecast?: WeatherError;
  };
}

interface WeatherError {
  kind: WeatherErrorKind;
  message: string;
  retryable: boolean;
}

interface Preferences {
  lastCity: City | null;
  unit: Unit;
}
```

Regras do contrato: temperaturas entram e permanecem em Celsius; somente a camada de apresentação converte e arredonda. Umidade e probabilidade são percentuais; vento é km/h; precipitação é mm. Campos complementares ausentes são `null` e apresentados como `Indisponível`. Cada resposta de bloco essencial inválida produz erro daquele bloco, sem apagar os outros dados válidos. A previsão contém até cinco posições para as datas locais esperadas; datas sem campos essenciais usam `status: 'unavailable'`.

Contratos entre camadas:

```ts
searchCities(query: string, signal?: AbortSignal): Promise<City[]>;
getWeather(city: City, signal?: AbortSignal): Promise<WeatherData>;
readPreferences(): Preferences;
writePreferences(preferences: Preferences): void;
```

`WeatherServiceError` deve carregar `kind`, mensagem pt-BR segura para exibição e se a operação pode ser repetida. O serviço de preferências deve falhar de forma silenciosa e previsível quando `localStorage` estiver bloqueado ou indisponível.

## Data Flow

1. Na inicialização, ler preferências locais; usar Celsius se não existirem ou se a leitura falhar.
2. Se houver cidade salva, restaurá-la e iniciar uma nova consulta meteorológica. Não restaurar dados meteorológicos antigos.
3. Ao enviar busca, remover espaços nas extremidades, validar 1–100 caracteres e não fazer chamada para entrada vazia/inválida.
4. Buscar até cinco cidades. Com zero resultados, expor estado `empty`; com um resultado, selecioná-lo automaticamente; com múltiplos, aguardar seleção explícita.
5. Ao selecionar uma cidade, salvar cidade/unidade localmente e consultar previsão atual + diária para as coordenadas selecionadas.
6. Validar e mapear a resposta em blocos atuais e diários. Renderizar os blocos válidos e estados indisponíveis/erro dos blocos inválidos.
7. Trocar °C/°F apenas na apresentação, sem nova chamada à API; persistir a preferência local.
8. Em nova busca ou seleção antes da resposta anterior, abortar a chamada antiga quando possível e ignorar toda resposta cujo identificador de requisição não seja o atual.

## External APIs

### Open-Meteo Geocoding

- **Método/endpoint:** `GET https://geocoding-api.open-meteo.com/v1/search`.
- **Parâmetros:** `name` (URL-encoded), `count=5`, `language=pt`, `format=json`.
- **Campos usados:** `id`, `name`, `admin1`, `country`, `latitude`, `longitude`.
- `results` ausente ou vazio representa zero resultados; resposta HTTP não-2xx, timeout ou JSON inválido representa erro, nunca busca vazia.

Exemplo resumido de resposta:

```json
{
  "results": [
    {
      "id": 123456,
      "name": "Springfield",
      "latitude": 39.78,
      "longitude": -89.64,
      "admin1": "Illinois",
      "country": "United States"
    }
  ]
}
```

Mapeamento: cada item de `results` vira um `City`: `id`, `name`, `admin1`, `country`, `latitude` e `longitude` são copiados; `admin1` e `country` ausentes viram `null`. A seleção do resultado fornece o `City` usado no pedido de forecast.

### Open-Meteo Forecast

- **Método/endpoint:** `GET https://api.open-meteo.com/v1/forecast`.
- **Coordenadas:** latitude/longitude do `City` explicitamente selecionado.
- **Parâmetros comuns:** `latitude`, `longitude`, `timezone=auto`, `forecast_days=5`, `temperature_unit=celsius`, `wind_speed_unit=kmh`, `precipitation_unit=mm`.
- **Parâmetro `current`:** `temperature_2m,weather_code,time,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation`.
- **Parâmetro `daily`:** `weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max,wind_speed_10m_max`.
- `time` diário é interpretado no fuso retornado pela API (`timezone=auto`); não converter para o fuso do dispositivo. `forecast_days=5` corresponde a hoje local e aos quatro dias seguintes.
- Validar cobertura, limites e termos de uso da fonte antes do lançamento. Não assumir SLA do provider. Tratar HTTP 429 sem retry automático; oferecer retry manual.

Exemplo resumido de resposta:

```json
{
  "timezone": "America/Sao_Paulo",
  "current": {
    "time": "2026-03-10T12:00",
    "temperature_2m": 20.0,
    "weather_code": 0,
    "apparent_temperature": 18.0,
    "relative_humidity_2m": 55,
    "wind_speed_10m": 14.0,
    "precipitation": 0.0
  },
  "daily": {
    "time": ["2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14"],
    "weather_code": [0, 2, 3, 61, 1],
    "temperature_2m_min": [15.0, 16.0, 17.0, 16.0, 15.0],
    "temperature_2m_max": [25.0, 26.0, 27.0, 24.0, 25.0],
    "precipitation_probability_max": [0, 10, 20, 60, null],
    "wind_speed_10m_max": [14.0, 16.0, 12.0, 20.0, 18.0]
  }
}
```

Mapeamento para o modelo de dados:

- Resposta do endpoint → `WeatherData`: `city` é o resultado selecionado; `timezone` vem da resposta; `current` e `daily` são validados e mapeados independentemente.
- `current.time` → `CurrentWeather.observedAt`; `temperature_2m` → `temperatureC`; `weather_code` → `weatherCode`; `apparent_temperature` → `apparentTemperatureC`; `relative_humidity_2m` → `humidityPercent`; `wind_speed_10m` → `windKmh`; `precipitation` → `precipitationMm`.
- Para cada índice `i` de `daily.time`, criar um `ForecastDay`: `time[i]` → `date`; `weather_code[i]` → `weatherCode`; `temperature_2m_min[i]`/`temperature_2m_max[i]` → `minTemperatureC`/`maxTemperatureC`; `precipitation_probability_max[i]` → `precipitationProbabilityPercent`; `wind_speed_10m_max[i]` → `maxWindKmh`.
- `null` e campos complementares ausentes permanecem `null`; não converter para zero. Campo essencial inválido invalida somente o bloco/dia correspondente, conforme `Error Handling`.

## State Management

Não introduzir store global. O estado remoto da tela vive no hook `useWeather`; a unidade selecionada vive no componente raiz `App` (ou em um hook de preferências usado por ele). O texto ainda não enviado pode permanecer como estado local de `SearchBar`; resultados, cidade selecionada e estados de requisição pertencem ao hook.

Usar uma união compartilhada para os ciclos assíncronos:

```ts
type RequestStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';
```

- `searchStatus`: `idle` antes da primeira busca; `loading` enquanto geocodifica; `empty` quando a busca válida retorna zero cidades; `success` quando há resultados; `error` para falha de rede, HTTP ou payload inválido.
- `weatherStatus`: `idle` sem cidade selecionada; `loading` durante a consulta; `success` quando pelo menos um bloco meteorológico é válido; `error` quando current e forecast falham ou não contêm os campos essenciais. `empty` não é usado para falha meteorológica nem para campos ausentes.
- Estado do hook: `cities`, `selectedCity`, `weatherData`, `searchError`, `currentError` e `forecastError`. Erros por bloco permitem apresentar clima atual mesmo quando a previsão falha, e vice-versa.
- `unit`: estado da aplicação, inicializado a partir das preferências locais; se ausente ou ilegível, usar Celsius. Ao alternar, gravar a preferência local sem bloquear a interação se o storage falhar.
- `SearchBar` mantém apenas o texto de edição e estados transitórios de foco; não duplica o status remoto nem faz chamadas de serviço.

Unidades: `WeatherData` mantém temperaturas sempre em Celsius. Componentes recebem o valor original e `unit`; funções puras de `lib/temperature.ts` convertem e arredondam durante a renderização. A troca de unidade não chama `searchCities` nem `getWeather` e não altera cidade ou datas. A preferência de unidade pode ser persistida localmente; os dados meteorológicos nunca são armazenados para uso offline.

Para cada busca/consulta, manter um `AbortController` e/ou identificador monotônico. Uma nova ação aborta a requisição anterior quando possível; respostas de requisições antigas são ignoradas mesmo se o cancelamento não impedir sua conclusão. A UI não interpreta DTO da Open-Meteo.

## Error Handling

- **Rede:** falha de conexão mantém a ação em `error`, exibe `Falha de rede. Verifique sua conexão.` e oferece retry manual. Não tratar como zero resultados.
- **HTTP/API:** respostas não-2xx geram erro com contexto da operação (busca ou clima). HTTP 429 informa limite temporário; 5xx informa indisponibilidade. Não fazer retry automático. A mensagem técnica/status fica em telemetria, não na UI.
- **Timeout:** cada chamada é abortada após 10 segundos; sair de `loading`, mostrar `A requisição demorou demais. Tente novamente.` e oferecer retry manual. Cancelamento causado por uma nova busca não deve exibir erro para a pessoa usuária.
- **JSON inválido/contrato alterado:** classificar como `invalid-response`; não converter para lista vazia ou valores zero. Registrar o erro técnico sem expor o payload bruto.
- **Resposta parcial:** validar `current` e `daily` separadamente. Campo complementar ausente ou `null` vira `null` no domínio e `Indisponível` na apresentação. Ausência de campo essencial invalida somente o bloco/dia correspondente; se o outro bloco for válido, `weatherStatus` permanece `success` e seu erro fica associado ao bloco indisponível.
- **Sem resultados:** somente busca válida concluída com `results` vazio produz `searchStatus: 'empty'` e `Nenhuma cidade encontrada`. `results` ausente em JSON malformado é `error`, não `empty`.
- **Código meteorológico desconhecido:** apresentar `Condição desconhecida`; temperatura e demais valores válidos permanecem disponíveis.
- **Storage local:** se leitura/gravação falhar, usar Celsius e manter busca/consulta funcionais. Não enviar preferências ao servidor.
- **Concorrência:** ignorar resposta de busca/forecast que não corresponda ao identificador da última ação, prevenindo dados de cidade anterior na tela.
- **Acessibilidade:** estados e mensagens de erro devem ser anunciáveis por leitor de tela; retry deve ter nome acessível e continuar operável por teclado.

## Testing Strategy

- **Vitest — funções puras:** cobrir `°C → °F` e retorno, pontos conhecidos (`0`, `100`, `-40`), decimais/arredondamento, rótulos de unidade, formatação de datas pt-BR por fuso e códigos WMO conhecidos/desconhecidos. Testes não devem usar relógio ou rede reais.
- **Vitest — services com `fetch` mockado:** verificar URL, parâmetros, coordenadas, unidades, limite de cinco resultados e codificação de caracteres; validar mapeamento de respostas válidas e parciais. Cobrir `results: []` como vazio, JSON inválido como erro, HTTP 429/5xx, falha de rede, abort/timeout de 10 s e não converter `null` em zero. Usar timers falsos no teste de timeout.
- **Vitest — preferências:** cobrir primeira execução, gravação/leitura da última cidade e unidade, JSON local inválido e `localStorage` bloqueado/lançando exceção; nesse último caso, aplicação continua com Celsius.
- **Testing Library — hooks/componentes:** renderizar e verificar `idle`, `loading`, `success`, `empty` e `error`; busca vazia, sem resultado, resultado único (seleção automática) e múltiplos (seleção explícita); dados completos/parciais, mensagem de erro e retry. Verificar que trocar unidade não chama `fetch` novamente, que storage restaura preferências e que uma resposta obsoleta não substitui a seleção atual. Preferir asserts por roles e nomes acessíveis.
- **Playwright — E2E:** interceptar endpoints Open-Meteo com fixtures; cobrir a jornada de busca → seleção → clima atual/previsão → alternância C/F, restauração após reload, vazio e erro com retry. Validar navegação por teclado e layout nos viewports mobile de 320 e 375 px e desktop de 1280 px. Os testes de CI não chamam a API real.
- **Limite dos mocks:** mocks confirmam contrato da aplicação, não disponibilidade, cobertura ou aderência atual do fornecedor. Validar isso separadamente em uma verificação de integração controlada antes do lançamento, sem tornar os testes de CI dependentes da rede externa.
- **Gates:** `pnpm lint`, `pnpm build`, `pnpm test` e `pnpm test:e2e` antes da entrega da implementação.

## Risks & Trade-offs

| Decisão | Alternativa considerada | Trade-off e justificativa |
|---|---|---|
| Chamar Open-Meteo diretamente do navegador, sem chave | Backend/BFF como proxy | Menos infraestrutura e nenhum segredo a proteger; em contrapartida, há dependência direta de disponibilidade, CORS e limites do provider, sem cache/proxy controlado. Reavaliar apenas se limites ou requisitos operacionais exigirem. |
| Hooks React locais para estado | Redux/Zustand ou cache de servidor | Menos dependências e cerimônia para uma única tela; exige cuidar explicitamente de estados, cancelamento e respostas obsoletas. |
| `fetch` nativo | Axios ou cliente HTTP dedicado | Evita dependência e já oferece `AbortController`; a aplicação mantém tratamento de status, JSON e erros no service. |
| Persistir cidade/unidade no armazenamento local | Conta e persistência no servidor | Funciona sem autenticação e reduz dados armazenados; preferências podem ser apagadas, compartilhadas no dispositivo e não sincronizam entre navegadores. |
| Guardar temperaturas em Celsius e converter na renderização | Solicitar novamente à API ao trocar unidade ou armazenar valores em unidades mistas | Troca imediata sem rede e evita divergência entre blocos; conversão e arredondamento precisam ser testados, mantendo Celsius como única origem. |
| Vitest/Playwright com respostas simuladas | E2E sempre contra API real | Fixtures dão testes determinísticos, rápidos e sem quota/rede externa; não validam o fornecedor real, que exige verificação de integração separada antes do lançamento. |
| Sem retry automático; retry manual | Backoff/retry automático | Evita rajadas e comportamento surpresa perante limite 429; a pessoa precisa acionar novamente após falhas temporárias. |
| Sem cache meteorológico offline | Cache local com idade máxima | Evita apresentar previsão velha como atual e simplifica a consistência; consultas dependem de conectividade disponível. |
