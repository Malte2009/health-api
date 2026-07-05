import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMetricsForFilterSet } from './calculateHrvMetrics';

const filters = {
    adaptive: true,
    range: true,
    movingAverage: true,
    artifact: true
};

test('calculateMetricsForFilterSet returns only finite numbers or null for extreme filtered data', () => {
    const metrics = calculateMetricsForFilterSet(new Array(40).fill(5000), filters);

    for (const [key, value] of Object.entries(metrics)) {
        if (typeof value === 'number') {
            assert.equal(Number.isFinite(value), true, `${key} should be finite`);
        }
    }
});

test('calculateMetricsForFilterSet keeps normal RR data finite', () => {
    const data = Array.from({ length: 80 }, (_, index) => 780 + (index % 8) * 8);
    const metrics = calculateMetricsForFilterSet(data, {
        adaptive: false,
        range: false,
        movingAverage: false,
        artifact: false
    });

    assert.equal(typeof metrics.mean_rr_ms, 'number');
    assert.equal(typeof metrics.rmssd_ms, 'number');
    assert.equal(Number.isFinite(metrics.mean_rr_ms), true);
    assert.equal(Number.isFinite(metrics.rmssd_ms), true);
});
