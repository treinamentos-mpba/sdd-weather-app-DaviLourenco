import { getDayLabel, getShortDate } from '../lib/format';
import { formatTemperature } from '../lib/temperature';
import { getWeatherIcon, getWeatherLabel } from '../lib/weatherCodes';
import type { ForecastDay, Unit } from '../types/weather';

interface ForecastCardProps {
  day: ForecastDay;
  index: number;
  unit: Unit;
}

/** Card de um dia da previsão. */
export default function ForecastCard({ day, index, unit }: ForecastCardProps) {
  if (day.status === 'unavailable') {
    return (
      <li className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-md sm:p-4">
        <p className="font-semibold">{getDayLabel(day.date, index)}</p>
        <p className="text-xs text-white/50">{getShortDate(day.date)}</p>
        <p className="text-sm text-white/80">Previsão indisponível</p>
      </li>
    );
  }

  const precipitation =
    day.precipitationProbabilityPercent === null
      ? 'Indisponível'
      : `${day.precipitationProbabilityPercent}%`;
  const unitSuffix = unit === 'celsius' ? 'C' : 'F';

  return (
    <li className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-md sm:p-4">
      <p className="font-semibold">{getDayLabel(day.date, index)}</p>
      <p className="text-xs text-white/50">{getShortDate(day.date)}</p>
      <span role="img" aria-label={getWeatherLabel(day.weatherCode)} className="text-3xl">
        {getWeatherIcon(day.weatherCode)}
      </span>
      <p className="flex max-w-full flex-wrap justify-center gap-x-2 gap-y-1 text-xs sm:text-sm">
        <span className="font-semibold">
          Máx {formatTemperature(day.maxTemperatureC, unit)}
          {unitSuffix}
        </span>
        <span className="text-white/70">
          Mín {formatTemperature(day.minTemperatureC, unit)}
          {unitSuffix}
        </span>
      </p>
      <p className="text-xs text-accent-300">
        <span aria-hidden="true">💧 </span>Chuva {precipitation}
      </p>
    </li>
  );
}
