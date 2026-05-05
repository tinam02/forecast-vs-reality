<script lang="ts">
	import type { LieScore } from './types';

	interface Props {
		lieScore: LieScore;
	}
	let { lieScore }: Props = $props();

	const verdict = $derived.by(() => {
		const s = lieScore.score;
		if (s < 15) return 'Pretty close to the truth';
		if (s < 35) return 'A bit off';
		if (s < 55) return 'Stretching it';
		if (s < 75) return 'Lying';
		return 'Lying through its teeth';
	});

	const labelMap: Record<string, string> = {
		tempMax: 'high temp',
		tempMin: 'low temp',
		precipitationSum: 'rain',
		windMax: 'wind',
		cloudMean: 'clouds'
	};
</script>

<div class="lie-meter">
	<div class="header">
		<span class="title">Lie meter</span>
		<span class="verdict">{verdict}</span>
	</div>
	<div class="bar-track">
		<div class="bar-fill" style="width: {lieScore.score}%"></div>
		<div class="bar-label">{lieScore.score.toFixed(0)}%</div>
	</div>
	<div class="contributions">
		{#each Object.entries(lieScore.contributions) as [key, value] (key)}
			<span class="chip">
				{labelMap[key] ?? key}: {value?.toFixed(0)}%
			</span>
		{/each}
	</div>
</div>

<style>
	.lie-meter {
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 10px;
		padding: 1rem 1.25rem;
		margin: 1rem 0;
	}
	.header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 0.5rem;
	}
	.title {
		font-size: 0.85rem;
		font-weight: 600;
		color: #555;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.verdict {
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}
	.bar-track {
		position: relative;
		height: 28px;
		background: #f0f0f0;
		border-radius: 6px;
		overflow: hidden;
	}
	.bar-fill {
		height: 100%;
		background: linear-gradient(
			90deg,
			#2a8b2a 0%,
			#b8a82a 30%,
			#d68a2a 55%,
			#c45a2a 75%,
			#a02525 100%
		);
		background-size: 100vw 100%;
		transition: width 0.4s ease;
	}
	.bar-label {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		color: #1a1a1a;
		text-shadow: 0 1px 2px rgba(255, 255, 255, 0.6);
	}
	.contributions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.6rem;
	}
	.chip {
		font-size: 0.8rem;
		color: #555;
		background: #f7f7f7;
		border: 1px solid #e3e3e3;
		padding: 0.15rem 0.5rem;
		border-radius: 99px;
	}
</style>
