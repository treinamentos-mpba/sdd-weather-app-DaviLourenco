import { formatTemperature } from '../lib/temperature';
import { getWeatherIcon, getWeatherLabel } from '../lib/weatherCodes';
import type { City, CurrentWeather as CurrentWeatherType, Unit } from '../types/weather';

interface CurrentWeatherProps {
  city: City;
  current: CurrentWeatherType | null;
  unit: Unit;
}

interface MetricProps {
  icon: string;
  label: string;
  value: string;
}

function Metric({ icon, label, value }: MetricProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
      <span aria-hidden="true" className="text-xl">
        {icon}
      </span>
      <dl className="min-w-0">
        <dt className="text-xs text-white/70">{label}</dt>
        <dd className="break-words font-semibold">{value}</dd>
      </dl>
    </div>
  );
}

/** Seção "hero" com as condições atuais da cidade selecionada. */
export default function CurrentWeather({ city, current, unit }: CurrentWeatherProps) {
  const location = [city.admin1, city.country].filter(Boolean).join(', ');

  if (!current) {
    return (
      <section
        aria-label="Clima atual"
        className="rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <h2 className="break-words text-2xl font-bold">{city.name}</h2>
        <p role="status" className="mt-4 text-white/80">
          Clima atual indisponível.
        </p>
      </section>
    );
  }

  const unavailable = 'Indisponível';

  return (
    <section
      aria-label="Clima atual"
      className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-glass backdrop-blur-md sm:p-6 md:p-8"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="break-words text-2xl font-bold md:text-3xl">{city.name}</h2>
          {location && <p className="text-white/70">{location}</p>}

          <div className="mt-6 flex items-center gap-4">
            <span aria-hidden="true" className="text-6xl">
              {getWeatherIcon(current.weatherCode)}
            </span>
            <output
              aria-label={`Temperatura atual: ${formatTemperature(current.temperatureC, unit)} ${unit === 'celsius' ? 'Celsius' : 'Fahrenheit'}`}
              className="text-6xl font-light md:text-7xl"
            >
              {formatTemperature(current.temperatureC, unit)}
            </output>
          </div>
          <p className="mt-2 text-white/70">{getWeatherLabel(current.weatherCode)}</p>
          <p className="mt-1 text-sm text-white/70">Observado em {current.observedAt}</p>
        </div>

        <dl className="grid min-w-0 grid-cols-2 gap-3">
          <Metric
            icon="🌡️"
            label="Sensação térmica"
            value={
              current.apparentTemperatureC === null
                ? unavailable
                : formatTemperature(current.apparentTemperatureC, unit)
            }
          />
          <Metric
            icon="💧"
            label="Umidade"
            value={
              current.humidityPercent === null
                ? unavailable
                : `${Math.round(current.humidityPercent)}%`
            }
          />
          <Metric
            icon="💨"
            label="Vento"
            value={current.windKmh === null ? unavailable : `${Math.round(current.windKmh)} km/h`}
          />
          <Metric
            icon="🌧️"
            label="Precipitação"
            value={current.precipitationMm === null ? unavailable : `${current.precipitationMm} mm`}
          />
          <Metric
            icon="📊"
            label="Pressão"
            value={
              current.surfacePressureHpa === null
                ? unavailable
                : `${Math.round(current.surfacePressureHpa)} hPa`
            }
          />
        </dl>
      </div>
    </section>
  );
}
