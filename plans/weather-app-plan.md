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
  country: string;
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

### Open-Meteo Forecast

- **Método/endpoint:** `GET https://api.open-meteo.com/v1/forecast`.
- **Coordenadas:** latitude/longitude do `City` explicitamente selecionado.
- **Parâmetros base:** `timezone=auto`, `forecast_days=5`, `temperature_unit=celsius`, `wind_speed_unit=kmh`, `precipitation_unit=mm`.
- **Campos atuais:** `temperature_2m`, `weather_code`, `time`, `apparent_temperature`, `relative_humidity_2m`, `wind_speed_10m`, `precipitation`.
- **Campos diários:** `time`, `weather_code`, `temperature_2m_min`, `temperature_2m_max`, `precipitation_probability_max`, `wind_speed_10m_max`.
- `time` diário é interpretado no fuso retornado pela API (`timezone=auto`); não converter para o fuso do dispositivo.
- Validar cobertura, limites e termos de uso da fonte antes do lançamento. Não assumir SLA do provider. Tratar HTTP 429 sem retry automático; oferecer retry manual.

## State Management

Manter estado na aplicação/hook, sem store global. O hook deve expor estado de busca e estado de meteorologia separadamente para que resultados de geocodificação não sejam confundidos com carregamento da previsão.

Modelo de estado recomendado:

- `query`, `cities`, `selectedCity`;
- `searchStatus` e `weatherStatus`;
- `weatherData` com blocos atual/previsão independentes;
- `searchError` e erros por bloco;
- `unit`, carregada/salva via serviço local.

Usar `AbortController` ou contador de requisição para cancelamento/ordenação. O componente de apresentação não deve iniciar fetch nem interpretar DTO da Open-Meteo. Não introduzir cache de dados meteorológicos; cache local é somente para cidade e unidade.

## Error Handling

- Entrada inválida: validação inline; nenhuma chamada de rede.
- Busca válida sem resultados: estado `empty` e mensagem `Nenhuma cidade encontrada`.
- Erro de rede/HTTP: estado `error`, mensagem amigável apropriada à ação e retry manual.
- Timeout: abortar cada requisição após 10 s e apresentar `A requisição demorou demais. Tente novamente.`
- HTTP 429: reportar indisponibilidade/limite e não repetir automaticamente.
- JSON inválido ou campos essenciais ausentes: classificar como `invalid-response`; não converter falha em lista vazia ou zeros.
- Campo complementar ausente ou `null`: preservar dados restantes e renderizar `Indisponível`.
- Condição desconhecida: renderizar `Condição desconhecida`, sem falhar o cartão.
- Preferências locais inacessíveis: usar Celsius e continuar sem persistência.
- Erros e estados devem ser acessíveis (mensagem anunciável, retry com nome claro); detalhes internos e payload bruto não são exibidos ao usuário.

## Testing Strategy

- **Unitários (Vitest):** conversão/arredondamento C/F, formatação pt-BR/fuso local, mapeamento de códigos conhecidos/desconhecidos, validação de input e mapeamento/validação de payloads.
- **Serviço (Vitest):** mock de `fetch`; verificar endpoints/parâmetros, coordenadas, unidades, limite de cinco resultados, caracteres acentuados, payload parcial, JSON inválido, HTTP 429/5xx, falha de rede e timeout com relógio falso.
- **Preferências (Vitest):** ausência de valores, persistência de cidade/unidade e exceção de `localStorage`.
- **Hook/componentes (Testing Library):** busca vazia, zero/um/múltiplos resultados, seleção explícita, loading, resposta obsoleta, dados atuais/previsão, toggle sem refetch, erro/retry e preferência restaurada.
- **E2E (Playwright):** interceptar Open-Meteo com fixtures; validar fluxos principais, teclas, estados de erro e viewports de 320/375/768/1280/1920 px. Nunca depender da API externa em CI.
- **Gates:** `pnpm lint`, `pnpm build`, `pnpm test` e `pnpm test:e2e` antes da entrega da implementação.

## Risks & Trade-offs

| Risco/Trade-off | Efeito | Mitigação/decisão |
|---|---|---|
| Dependência direta da Open-Meteo no navegador | Disponibilidade, limites e termos do provider afetam a experiência; sem backend, não há proxy/cache controlado pelo produto. | Validar termos/limites, monitorar provider e comunicar falhas; reavaliar backend apenas se houver necessidade comprovada. |
| Campos exigidos não disponíveis para toda localização | Blocos atuais ou dias podem ficar indisponíveis. | Distinguir essenciais de complementares e validar payload antes de mapear; testar respostas parciais. |
| Selecionar automaticamente cidade quando há apenas um resultado, mas exigir escolha com vários | Simplifica buscas inequívocas, preservando precisão em homônimos. | Cobrir ambos os caminhos em testes automatizados. |
| Preferências em armazenamento local | Preferências somem quando os dados do navegador são apagados e não acompanham a pessoa entre dispositivos. | Aceitar o trade-off na v1; iniciar com Celsius e permitir busca manual sem storage. |
| Critérios operacionais dependem de infraestrutura ainda não definida | SLO de disponibilidade exige monitoramento e hospedagem configurados. | Definir probes e responsáveis no plano de entrega antes de declarar o SLO atendido. |
