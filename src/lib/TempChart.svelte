<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables, type ChartConfiguration } from 'chart.js';

	Chart.register(...registerables);

	interface Props {
		time: string[];
		actual: (number | null)[];
		predicted: (number | null)[];
		leadDays: number;
	}

	let { time, actual, predicted, leadDays }: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let chart: Chart | undefined;

	function buildConfig(): ChartConfiguration {
		const labels = time.map((t) => t.slice(11, 16));
		return {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'Actual (latest analysis)',
						data: actual.map((v) => (v ?? null) as number),
						borderColor: '#1f7a1f',
						backgroundColor: 'rgba(31,122,31,0.1)',
						tension: 0.3,
						spanGaps: true
					},
					{
						label: `Forecast issued ${leadDays} day${leadDays === 1 ? '' : 's'} earlier`,
						data: predicted.map((v) => (v ?? null) as number),
						borderColor: '#c24545',
						backgroundColor: 'rgba(194,69,69,0.1)',
						borderDash: [6, 4],
						tension: 0.3,
						spanGaps: true
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				scales: {
					y: { title: { display: true, text: 'Temperature (°C)' } },
					x: { title: { display: true, text: 'Hour (local)' } }
				}
			}
		};
	}

	onMount(() => {
		if (canvas) {
			chart = new Chart(canvas, buildConfig());
		}
	});

	$effect(() => {
		if (chart) {
			const cfg = buildConfig();
			chart.data = cfg.data;
			chart.options = cfg.options ?? {};
			chart.update();
		}
	});

	onDestroy(() => {
		chart?.destroy();
	});
</script>

<div class="chart-wrap">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart-wrap {
		position: relative;
		width: 100%;
		height: 360px;
	}
</style>
