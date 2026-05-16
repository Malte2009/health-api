import * as fs from 'fs';
import * as path from 'path';

function getMedian(data: number[]): number {
    if (data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

function getMean(data: number[]): number {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
}

export function parseData(id: string): number[] {
    const filePath = path.join(process.cwd(), 'rrdata', `${id}.txt`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Report with id ${id} not found.`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    let data: number[] = [];

    for (const line of lines) {
        if (!line.trim()) continue;
        const normalizedLine = line.replace(',', '.');
        const num = parseFloat(normalizedLine);
        if (!isNaN(num)) {
            data.push(num);
        }
    }

    if (data.length > 0) {
        const median = getMedian(data);
        if (median > 3000) {
            data = data.map(val => val / 1000);
        }
    }

    return data;
}

function getLocalBaseline(data: number[], index: number, radius = 2): number {
    const start = Math.max(0, index - radius);
    const end = Math.min(data.length - 1, index + radius);
    const neighbors = [];
    for (let i = start; i <= end; i++) {
        if (i !== index) {
            neighbors.push(data[i]);
        }
    }
    return getMedian(neighbors);
}

export function apply_contextual_artifact_filter(rr_data: number[]) {
    const n = rr_data.length;
    if (n === 0) return { result: [], stats: { replaced_artifact_split: 0, preserved_vagal_burst: 0, preserved_pvc: 0, merged_with_previous: 0, artifact_total: 0, preserved_tachy: 0} };

    let baselines = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        baselines[i] = getLocalBaseline(rr_data, i);
    }

    let isTachy = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
        if (rr_data[i] < 0.6 * baselines[i]) {
            isTachy[i] = true;
        }
    }

    let protectedIndices = new Set<number>();
    let runCount = 0;
    for (let i = 0; i < n; i++) {
        if (isTachy[i]) {
            runCount++;
        } else {
            if (runCount >= 3) {
                for (let j = i - runCount; j < i; j++) {
                    protectedIndices.add(j);
                }
            }
            runCount = 0;
        }
    }
    if (runCount >= 3) {
        for (let j = n - runCount; j < n; j++) {
            protectedIndices.add(j);
        }
    }

    const result: number[] = [];
    let stats = {
        replaced_artifact_split: 0,
        preserved_vagal_burst: 0,
        preserved_pvc: 0,
        merged_with_previous: 0,
        artifact_total: 0,
        preserved_tachy: 0
    };

    for (let i = 0; i < n; i++) {
        const rr = rr_data[i];
        const baseline = baselines[i];

        if (rr < 0.6 * baseline && !protectedIndices.has(i)) {
            stats.artifact_total++;
            if (rr < 250) {
                if (result.length > 0) {
                    result[result.length - 1] += rr;
                    stats.merged_with_previous++;
                } else {
                    result.push(rr);
                }
                continue;
            }

            const nextRr = i + 1 < n ? rr_data[i + 1] : -1;
            const nextBaseline = i + 1 < n ? baselines[i + 1] : -1;

            if (nextRr !== -1 && nextRr >= 0.8 * nextBaseline && nextRr <= 1.2 * nextBaseline) {
                if (result.length > 0) {
                    result[result.length - 1] += rr;
                    stats.merged_with_previous++;
                }
                continue;
            }

            if (nextRr !== -1 && nextRr > 1.25 * nextBaseline) {
                stats.preserved_pvc++;
                result.push(rr);
                continue;
            }
        } else if (protectedIndices.has(i)) {
            stats.preserved_tachy++;
        }

        if (rr > 1.5 * baseline) {
            stats.artifact_total++;
            const nextRr = i + 1 < n ? rr_data[i + 1] : -1;
            const nextBaseline = i + 1 < n ? baselines[i + 1] : -1;
            if (nextRr !== -1 && nextRr < 1.0 * nextBaseline) {
                result.push(rr / 2);
                result.push(rr / 2);
                stats.replaced_artifact_split++;
                continue;
            } else {
                stats.preserved_vagal_burst++;
            }
        }

        result.push(rr);
    }

    return { result, stats };
}

function interpolate_nans(data: (number | null)[]): number[] {
    const result = data.slice();
    for (let i = 0; i < result.length; i++) {
        if (result[i] === null) {
            let left = i - 1;
            while (left >= 0 && result[left] === null) left--;
            let right = i + 1;
            while (right < result.length && result[right] === null) right++;

            if (left >= 0 && right < result.length) {
                const step = ((result[right] as number) - (result[left] as number)) / (right - left);
                result[i] = (result[left] as number) + step * (i - left);
            } else if (left >= 0) {
                result[i] = result[left];
            } else if (right < result.length) {
                result[i] = result[right];
            } else {
                result[i] = 0;
            }
        }
    }
    return result as number[];
}

// Ensure dsp.js is required for Frequency metrics
// @ts-ignore
import * as DSP from 'dsp.js';

export function compute_frequency_metrics(data: number[]) {
    if (data.length < 10) return { vlf_power: 0, lf_power: 0, hf_power: 0, lf_hf_ratio: 0, hf_peak_hz: 0, rsa_bpm: 0 };

    let time = 0;
    let tSeries = [];
    for(let i = 0; i < data.length; i++) {
        time += data[i] / 1000.0;
        tSeries.push(time);
    }
    const maxTime = tSeries[tSeries.length - 1];

    const fs = 4.0;
    const dt = 1.0 / fs;
    let N_interp = Math.floor(maxTime / dt);

    if (N_interp <= 0) return { vlf_power: 0, lf_power: 0, hf_power: 0, lf_hf_ratio: 0, hf_peak_hz: 0, rsa_bpm: 0 };

    let N_pow2 = 1;
    while(N_pow2 < N_interp) N_pow2 *= 2;

    let interpData = new Array(N_pow2).fill(getMean(data));
    let lastIdx = 0;
    for(let i = 0; i < N_interp; i++) {
        let t_target = i * dt;
        while(lastIdx < tSeries.length - 1 && tSeries[lastIdx+1] < t_target) {
            lastIdx++;
        }
        if (lastIdx < tSeries.length - 1) {
            let t1 = tSeries[lastIdx], t2 = tSeries[lastIdx+1];
            let v1 = data[lastIdx], v2 = data[lastIdx+1];
            let frac = (t_target - t1) / (t2 - t1);
            interpData[i] = v1 + frac * (v2 - v1);
        } else {
            interpData[i] = data[data.length - 1];
        }
    }

    // Detrending (Linear Regression removal) 
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for(let i = 0; i < N_interp; i++) {
        sumX += i;
        sumY += interpData[i];
        sumXY += i * interpData[i];
        sumX2 += i * i;
    }

    // Protect against zero division
    let variance_X = (N_interp * sumX2 - sumX * sumX);
    let m = variance_X !== 0 ? (N_interp * sumXY - sumX * sumY) / variance_X : 0;
    let b = (sumY - m * sumX) / N_interp;
    
    // Detrend signal and calculate pure temporal variance based explicitly in ms^2
    let var_orig = 0;
    let detrended = new Array(N_interp);
    for(let i = 0; i < N_interp; i++) {
        detrended[i] = interpData[i] - (m * i + b);
        var_orig += detrended[i] * detrended[i];
    }
    var_orig /= Math.max(1, N_interp);

    // Applying Hanning Window to the detrended data
    for(let i = 0; i < N_interp; i++) {
        let window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N_interp - 1)));
        interpData[i] = detrended[i] * window;
    }
    
    // Fill the rest with 0 to complete power of 2 for FFT
    for(let i = N_interp; i < N_pow2; i++) {
        interpData[i] = 0;
    }

    const fft = new DSP.FFT(N_pow2, fs);
    fft.forward(interpData);
    let spectrum = fft.spectrum;

    // Get total raw power of the FFT spectrum.
    // By equating total spectrum power directly to the detrended variance (var_orig),
    // we bypass entirely the arbitrary scaling outputs of dsp.js and the energy loss of the Hanning Window.
    // This perfectly restores Parseval's theorem meaning our output is strictly in physical ms^2
    let total_raw_power = 0;
    let rawPowers = new Array(spectrum.length);
    for(let i = 0; i < spectrum.length; i++) {
        rawPowers[i] = spectrum[i] * spectrum[i];
        total_raw_power += rawPowers[i];
    }

    const powerScale = total_raw_power > 0 ? (var_orig / total_raw_power) : 0;

    let vlf_power = 0;
    let lf_power = 0;
    let hf_power = 0;
    let df = fs / N_pow2;
    let hf_peak_hz = 0;
    let max_hf_power = -1;

    for(let i = 0; i < spectrum.length; i++) {
        let freq = i * df;
        let power = rawPowers[i] * powerScale; // Explicitly inside ms^2 now!

        if (freq >= 0.0033 && freq <= 0.04) {
            vlf_power += power;
        } else if (freq > 0.04 && freq <= 0.15) {
            lf_power += power;
        } else if (freq > 0.15 && freq <= 0.4) {
            hf_power += power;
            if (power > max_hf_power) {
                max_hf_power = power;
                hf_peak_hz = freq;
            }
        }
    }

    const lf_hf_ratio = hf_power > 0 ? lf_power / hf_power : 0;
    const rsa_bpm = hf_peak_hz > 0 ? hf_peak_hz * 60.0 : 0;

    return { vlf_power, lf_power, hf_power, lf_hf_ratio, hf_peak_hz, rsa_bpm };
}

export function sampleEntropy(data: number[], m: number = 2, r: number): number {
    const N = data.length;
    if (N <= m) return 0;

    function countMatches(mLength: number) {
        let totalCount = 0;
        for (let i = 0; i < N - mLength; i++) {
            let count = 0;
            for (let j = 0; j < N - mLength; j++) {
                if (i !== j) {
                    let match = true;
                    for (let k = 0; k < mLength; k++) {
                        if (Math.abs(data[i + k] - data[j + k]) > r) {
                            match = false;
                            break;
                        }
                    }
                    if (match) count++;
                }
            }
            totalCount += count;
        }
        return totalCount;
    }

    let B = countMatches(m);
    let A = countMatches(m + 1);
    if (A === 0 || B === 0) return 0;
    return -Math.log(A / B);
}

export function approxEntropy(data: number[], m: number = 2, r: number): number {
    let N = data.length;
    if (N <= m) return 0;

    function phi(mLength: number) {
        let sumLog = 0;
        let countPatterns = N - mLength + 1;
        for (let i = 0; i < countPatterns; i++) {
            let count = 0;
            for (let j = 0; j < countPatterns; j++) {
                let match = true;
                for (let k = 0; k < mLength; k++) {
                    if (Math.abs(data[i + k] - data[j + k]) > r) {
                        match = false;
                        break;
                    }
                }
                if (match) count++;
            }
            sumLog += Math.log(count / countPatterns);
        }
        return sumLog / countPatterns;
    }

    return phi(m) - phi(m + 1);
}

export function computeDfaAlpha1(data: number[]): number {
    const N = data.length;
    if (N < 20) return 0;
    const mean = getMean(data);
    const y = new Array(N);
    let sum = 0;
    for (let i = 0; i < N; i++) {
        sum += (data[i] - mean);
        y[i] = sum;
    }

    const maxScale = Math.min(16, Math.floor(N/4));
    let F_n: number[] = [];
    let logs: number[] = [];
    let logF: number[] = [];

    for (let n = 4; n <= maxScale; n++) {
        let segments = Math.floor(N / n);
        let Fsq = 0;
        for (let s = 0; s < segments; s++) {
            let start = s * n;
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            for (let i = 0; i < n; i++) {
                let x = i + 1;
                sumX += x;
                sumY += y[start + i];
                sumX2 += x * x;
                sumXY += x * y[start + i];
            }
            let denom = n * sumX2 - sumX * sumX;
            if(denom === 0) continue;
            let m = (n * sumXY - sumX * sumY) / denom;
            let b = (sumY - m * sumX) / n;

            for (let i = 0; i < n; i++) {
                let x = i + 1;
                let fit = m * x + b;
                let diff = y[start + i] - fit;
                Fsq += diff * diff;
            }
        }
        if (segments > 0) {
            let f = Math.sqrt(Fsq / (segments * n));
            F_n.push(f);
            logs.push(Math.log10(n));
            logF.push(Math.log10(f));
        }
    }

    if (logs.length < 2) return 0;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    let len = logs.length;
    for(let i = 0; i < len; i++) {
        sumX += logs[i];
        sumY += logF[i];
        sumXY += logs[i] * logF[i];
        sumX2 += logs[i] * logs[i];
    }
    let denom = len * sumX2 - sumX * sumX;
    if (denom === 0) return 0;
    return (len * sumXY - sumX * sumY) / denom;
}

export function compute_entropy_metrics(data: number[], sdnn: number) {
    if (data.length < 50) return { sample_entropy: 0, approx_entropy: 0, dfa_alpha1: 0 };
    const r = 0.2 * sdnn;
    return {
        sample_entropy: sampleEntropy(data, 2, r),
        approx_entropy: approxEntropy(data, 2, r),
        dfa_alpha1: computeDfaAlpha1(data)
    };
}

export function apply_filters(rr_data: number[]): number[] {
    let data : (number|null)[] = rr_data.map(v => (v >= 300 && v <= 2000) ? v : null);
    data = interpolate_nans(data) as any;

    const window5 = 5;
    let data2 = [...data];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - Math.floor(window5 / 2));
        const end = Math.min(data.length - 1, i + Math.floor(window5 / 2));
        const slice = (data.slice(start, end + 1) as number[]).filter(v => v !== null);
        const mean = getMean(slice);
        if (mean > 0 && Math.abs((data[i] as number) - mean) / mean > 0.2) {
            data2[i] = null;
        }
    }
    data2 = interpolate_nans(data2) as any;

    const window11 = 11;
    let data3 = [...data2];
    for (let i = 0; i < data2.length; i++) {
        const start = Math.max(0, i - Math.floor(window11 / 2));
        const end = Math.min(data2.length - 1, i + Math.floor(window11 / 2));
        const slice = (data2.slice(start, end + 1) as number[]).filter(v => v !== null);
        const med = getMedian(slice);
        const mad = getMedian(slice.map(v => Math.abs(v - med)));
        if (Math.abs((data2[i] as number) - med) > 3.0 * mad) {
            data3[i] = null;
        }
    }
    return interpolate_nans(data3);
}

export function compute_time_metrics(data: number[]) {
    const mean_rr_ms = getMean(data);
    const mean_hr_bpm = 60000 / mean_rr_ms;

    let sumSqrDiff = 0;
    for (let i = 0; i < data.length; i++) {
        sumSqrDiff += Math.pow(data[i] - mean_rr_ms, 2);
    }
    const sdnn_ms = Math.sqrt(sumSqrDiff / (Math.max(1, data.length - 1)));

    let sumSqrDiffSeq = 0;
    let nn50_count = 0;
    for (let i = 0; i < data.length - 1; i++) {
        const diff = Math.abs(data[i + 1] - data[i]);
        sumSqrDiffSeq += Math.pow(diff, 2);
        if (diff > 50) {
            nn50_count++;
        }
    }
    const rmssd_ms = Math.sqrt(sumSqrDiffSeq / (Math.max(1, data.length - 1)));
    const pnn50_percent = (nn50_count / (Math.max(1, data.length - 1))) * 100;

    const max_hr_bpm = 60000 / Math.min(...data);
    const min_hr_bpm = 60000 / Math.max(...data);

    return { mean_rr_ms, mean_hr_bpm, min_hr_bpm, max_hr_bpm, sdnn_ms, rmssd_ms, pnn50_percent };
}

export function compute_poincare_metrics(data: number[]) {
    const diffs = [];
    for (let i = 0; i < data.length - 1; i++) {
        diffs.push(data[i+1] - data[i]);
    }
    const diff_mean = getMean(diffs);
    let diff_var = 0;
    for (let v of diffs) {
        diff_var += Math.pow(v - diff_mean, 2);
    }
    diff_var /= (diffs.length - 1 || 1);

    const sd1_ms = Math.sqrt(diff_var / 2);

    const data_mean = getMean(data);
    let rr_var = 0;
    for (let v of data) {
        rr_var += Math.pow(v - data_mean, 2);
    }
    rr_var /= (data.length - 1 || 1);

    const sd2_ms = Math.sqrt(Math.max(0, 2 * rr_var - Math.pow(sd1_ms, 2)));

    const sd1_sd2_ratio = sd2_ms !== 0 ? sd1_ms / sd2_ms : 0;
    const csi = sd1_ms !== 0 ? sd2_ms / sd1_ms : 0; // Fix: CSI = sd2 / sd1
    const cvi = Math.log10(sd1_ms * sd2_ms);

    // Calculate Baevsky's Stress Index (SI)
    // Formula: SI = AMo / (2 * Mo * MxDMn)
    // Mo (Mode) = most frequent RR interval bin (using 50ms bins)
    // AMo (Amplitude of Mode) = percentage of RR intervals in the Mode bin
    // MxDMn (Variation Spread) = max RR - min RR (in seconds!)

    let baevsky_si = 0;
    if (data.length > 0) {
        const minRR = Math.min(...data);
        const maxRR = Math.max(...data);
        const mxdmn = (maxRR - minRR) / 1000; // in seconds

        if (mxdmn > 0) {
            // Create histogram with 50ms bins
            const binSize = 50;
            const bins: { [key: number]: number } = {};
            let maxCount = 0;
            let modeBin = 0;

            for (const rr of data) {
                const bin = Math.floor(rr / binSize) * binSize;
                bins[bin] = (bins[bin] || 0) + 1;
                if (bins[bin] > maxCount) {
                    maxCount = bins[bin];
                    modeBin = bin + (binSize / 2); // Center of the bin
                }
            }

            const mo = modeBin / 1000; // Mode in seconds
            const amo = (maxCount / data.length) * 100; // AMo in percentage (0-100%)

            if (mo > 0) {
                baevsky_si = amo / (2 * mo * mxdmn);
            }
        }
    }

    return { sd1_ms, sd2_ms, baevsky_si, csi, cvi, sd1_sd2_ratio };
}

export function calculateMetricsForFilterSet(rr_data: number[], filters: { adaptive: boolean, range: boolean, movingAverage: boolean, artifact: boolean }) {
    let data = [...rr_data];
    let artifactStats = {
        replaced_artifact_split: 0,
        preserved_vagal_burst: 0,
        preserved_pvc: 0,
        merged_with_previous: 0,
        artifact_total: 0,
        preserved_tachy: 0
    };

    if (filters.artifact) {
        const art = apply_contextual_artifact_filter(data);
        data = art.result;
        artifactStats = art.stats;
    }

    let replaced_range = 0;
    if (filters.range) {
        let temp = data.map(v => {
            if (v >= 300 && v <= 2000) return v;
            replaced_range++;
            return null;
        });
        data = interpolate_nans(temp);
    }

    let replaced_moving_average = 0;
    if (filters.movingAverage) {
        const window5 = 5;
        let data2 = [...data] as (number | null)[];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - Math.floor(window5 / 2));
            const end = Math.min(data.length - 1, i + Math.floor(window5 / 2));
            const slice = (data.slice(start, end + 1)).filter(v => v !== null);
            const mean = getMean(slice);
            if (mean > 0 && Math.abs((data[i] as number) - mean) / mean > 0.2) {
                data2[i] = null;
                replaced_moving_average++;
            }
        }
        data = interpolate_nans(data2);
    }

    let replaced_adaptive = 0;
    if (filters.adaptive) {
        const window11 = 11;
        let data3 = [...data] as (number | null)[];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - Math.floor(window11 / 2));
            const end = Math.min(data.length - 1, i + Math.floor(window11 / 2));
            const slice = (data.slice(start, end + 1)).filter(v => v !== null);
            const med = getMedian(slice);
            const mad = getMedian(slice.map(v => Math.abs(v - med)));
            if (Math.abs((data[i] as number) - med) > 3.0 * mad) {
                data3[i] = null;
                replaced_adaptive++;
            }
        }
        data = interpolate_nans(data3);
    }

    const timeMetrics = compute_time_metrics(data);
    const poincare = compute_poincare_metrics(data);
    const freqDomain = compute_frequency_metrics(data);
    const entropy = compute_entropy_metrics(data, timeMetrics.sdnn_ms);
    const artifact_percent = rr_data.length > 0 ? (artifactStats.artifact_total / rr_data.length) * 100 : 0;

    return {
        ...timeMetrics,
        ...freqDomain,
        ...poincare,
        ...entropy,
        replaced_range,
        replaced_moving_average,
        replaced_adaptive,
        ...artifactStats,
        merged_with_previous: artifactStats.merged_with_previous > 0,
        artifact_merge_prev: artifactStats.merged_with_previous,
        artifact_percent,
        adaptiveFilteringApplied: filters.adaptive,
        rangeFilteringApplied: filters.range,
        artifactFilteringApplied: filters.artifact,
        movingAverageFilteringApplied: filters.movingAverage
    };
}

export function calculateHrvMetrics(id: string) {
    const rawData = parseData(id);

    const noFilter = calculateMetricsForFilterSet(rawData, { adaptive: false, range: false, movingAverage: false, artifact: false });
    const standardFilter = calculateMetricsForFilterSet(rawData, { adaptive: false, range: true, movingAverage: true, artifact: true });
    const allFilters = calculateMetricsForFilterSet(rawData, { adaptive: true, range: true, movingAverage: true, artifact: true });

    return [
        noFilter,
        standardFilter,
        allFilters
    ];
}

import prisma from '../prisma/client';

export async function processHrvChunksToDb(recordingId: string, startDateTime: Date) {
    const rawData = parseData(recordingId);
    const timeMs = [0];
    for (let i = 1; i < rawData.length; i++) {
        timeMs.push(timeMs[i-1] + rawData[i-1]);
    }

    // Group into 5 minute windows (300000 ms)
    const WINDOW_MS = 300000;
    let currentWindowStartIdx = 0;

    for (let i = 0; i < rawData.length; i++) {
        if (timeMs[i] - timeMs[currentWindowStartIdx] >= WINDOW_MS || i === rawData.length - 1) {
            const chunk = rawData.slice(currentWindowStartIdx, i + 1);
            if (chunk.length > 30) {
                const noFilter = calculateMetricsForFilterSet(chunk, { adaptive: false, range: false, movingAverage: false, artifact: false });
                const standardFilter = calculateMetricsForFilterSet(chunk, { adaptive: false, range: true, movingAverage: true, artifact: true });
                const allFilters = calculateMetricsForFilterSet(chunk, { adaptive: true, range: true, movingAverage: true, artifact: true });

                const windowStart = new Date((startDateTime?.getTime() || 0) + timeMs[currentWindowStartIdx]);

                const hrvWindow = await prisma.hrvWindow.create({
                    data: {
                        recordingId,
                        windowStart,
                        durationSeconds: 300,
                        metrics: {
                            create: [
                                noFilter, standardFilter, allFilters
                            ]
                        }
                    }
                });
            }
            currentWindowStartIdx = i + 1;
        }
    }
}
