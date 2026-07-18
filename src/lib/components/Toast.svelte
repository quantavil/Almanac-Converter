<script lang="ts">
	import { toast } from '$lib/stores/toast';
</script>

{#if $toast}
	<div class="toast" role="status">{$toast}</div>
{/if}
