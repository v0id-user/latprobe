/**
 * Execute various workloads with timing controls to ensure they don't exceed 100ms
 */
export async function executeWorkloads(ctx: DurableObjectState, parsed: any): Promise<void> {
	const startTime = Date.now();
	const maxDuration = 95; // Leave 5ms buffer

	console.debug(`[Workloads] Starting workload execution @${startTime} with maxDuration=${maxDuration}ms`);

	try {
		// 1. Fibonacci calculations (CPU intensive)
		const fibStart = Date.now();
		await executeWithTimeout(() => calculateFibonacci(35), maxDuration - (Date.now() - startTime));
		console.debug(`[Workloads] Fibonacci workload completed in ${Date.now() - fibStart}ms`);
		
		// 2. Math operations (prime checking, factorial)
		const mathStart = Date.now();
		await executeWithTimeout(() => mathOperations(), maxDuration - (Date.now() - startTime));
		console.debug(`[Workloads] Math operations workload completed in ${Date.now() - mathStart}ms`);
		
		// 3. String processing
		const stringStart = Date.now();
		await executeWithTimeout(() => stringProcessing(parsed.blob), maxDuration - (Date.now() - startTime));
		console.debug(`[Workloads] String processing workload completed in ${Date.now() - stringStart}ms`);
		
		// 4. Array operations
		const arrayStart = Date.now();
		await executeWithTimeout(() => arrayOperations(), maxDuration - (Date.now() - startTime));
		console.debug(`[Workloads] Array operations workload completed in ${Date.now() - arrayStart}ms`);
		
		// 5. Storage operations
		const storageStart = Date.now();
		await executeWithTimeout(() => storageOperations(ctx, parsed), maxDuration - (Date.now() - startTime));
		console.debug(`[Workloads] Storage operations workload completed in ${Date.now() - storageStart}ms`);
		
		console.debug(`[Workloads] All workloads completed successfully in ${Date.now() - startTime}ms`);
	} catch (error) {
		console.warn(`[Workloads] Workload execution timed out or failed @${Date.now()}: ${error}`);
	}
}

/**
 * Execute a function with timeout protection
 */
async function executeWithTimeout<T>(fn: () => T, maxMs: number): Promise<T | null> {
	if (maxMs <= 0) {
		console.debug(`[Workloads] executeWithTimeout: maxMs=${maxMs}, skipping execution`);
		return null;
	}
	
	console.debug(`[Workloads] executeWithTimeout: starting with maxMs=${maxMs}`);
	
	return new Promise((resolve) => {
		const timeoutId = setTimeout(() => {
			console.debug(`[Workloads] executeWithTimeout: timeout after ${maxMs}ms`);
			resolve(null);
		}, maxMs);
		
		try {
			const result = fn();
			clearTimeout(timeoutId);
			console.debug(`[Workloads] executeWithTimeout: completed successfully`);
			resolve(result);
		} catch (error) {
			clearTimeout(timeoutId);
			console.debug(`[Workloads] executeWithTimeout: caught error: ${error}`);
			resolve(null);
		}
	});
}

/**
 * Calculate fibonacci numbers (CPU intensive workload)
 */
function calculateFibonacci(n: number): number {
	console.debug(`[Workloads] calculateFibonacci: starting with n=${n}`);
	
	if (n <= 1) {
		console.debug(`[Workloads] calculateFibonacci: base case n=${n}, returning ${n}`);
		return n;
	}
	if (n === 2) {
		console.debug(`[Workloads] calculateFibonacci: base case n=2, returning 1`);
		return 1;
	}
	
	let a = 1, b = 1;
	for (let i = 3; i <= n; i++) {
		const temp = a + b;
		a = b;
		b = temp;
	}
	
	console.debug(`[Workloads] calculateFibonacci: completed fib(${n})=${b}`);
	return b;
}

/**
 * Various math operations
 */
function mathOperations(): void {
	console.debug(`[Workloads] mathOperations: starting math operations`);
	
	// Prime checking
	const primeStart = Date.now();
	const primes = findPrimesUpTo(1000);
	console.debug(`[Workloads] mathOperations: found ${primes.length} primes in ${Date.now() - primeStart}ms`);
	
	// Factorial calculation
	const factorialStart = Date.now();
	const factorial = calculateFactorial(20);
	console.debug(`[Workloads] mathOperations: calculated factorial(20)=${factorial} in ${Date.now() - factorialStart}ms`);
	
	// Matrix multiplication simulation
	const matrixStart = Date.now();
	simulateMatrixMultiplication(50);
	console.debug(`[Workloads] mathOperations: matrix multiplication completed in ${Date.now() - matrixStart}ms`);
	
	// Trigonometric calculations
	const trigStart = Date.now();
	let trigSum = 0;
	for (let i = 0; i < 100; i++) {
		trigSum += Math.sin(i * 0.1) + Math.cos(i * 0.1) + Math.tan(i * 0.1);
	}
	console.debug(`[Workloads] mathOperations: trigonometric calculations completed, sum=${trigSum} in ${Date.now() - trigStart}ms`);
	
	// Use computed values to prevent optimization
	if (primes.length + factorial + trigSum < -1) {
		console.log("Math operations completed");
	}
	
	console.debug(`[Workloads] mathOperations: all math operations completed successfully`);
}

/**
 * Find prime numbers up to a given limit
 */
function findPrimesUpTo(limit: number): number[] {
	console.debug(`[Workloads] findPrimesUpTo: starting with limit=${limit}`);
	
	const primes: number[] = [];
	const isPrime = new Array(limit + 1).fill(true);
	isPrime[0] = isPrime[1] = false;
	
	for (let i = 2; i <= Math.sqrt(limit); i++) {
		if (isPrime[i]) {
			for (let j = i * i; j <= limit; j += i) {
				isPrime[j] = false;
			}
		}
	}
	
	for (let i = 2; i <= limit; i++) {
		if (isPrime[i]) {
			primes.push(i);
		}
	}
	
	console.debug(`[Workloads] findPrimesUpTo: found ${primes.length} primes up to ${limit}`);
	return primes;
}

/**
 * Calculate factorial
 */
function calculateFactorial(n: number): number {
	console.debug(`[Workloads] calculateFactorial: starting with n=${n}`);
	
	if (n <= 1) {
		console.debug(`[Workloads] calculateFactorial: base case n=${n}, returning 1`);
		return 1;
	}
	
	let result = 1;
	for (let i = 2; i <= n; i++) {
		result *= i;
	}
	
	console.debug(`[Workloads] calculateFactorial: calculated factorial(${n})=${result}`);
	return result;
}

/**
 * Simulate matrix multiplication
 */
function simulateMatrixMultiplication(size: number): void {
	console.debug(`[Workloads] simulateMatrixMultiplication: starting with size=${size}x${size}`);
	
	const initStart = Date.now();
	const matrixA = new Array(size).fill(null).map(() => new Array(size).fill(Math.random()));
	const matrixB = new Array(size).fill(null).map(() => new Array(size).fill(Math.random()));
	const result = new Array(size).fill(null).map(() => new Array(size).fill(0));
	console.debug(`[Workloads] simulateMatrixMultiplication: matrix initialization completed in ${Date.now() - initStart}ms`);
	
	const multStart = Date.now();
	for (let i = 0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			for (let k = 0; k < size; k++) {
				result[i][j] += matrixA[i][k] * matrixB[k][j];
			}
		}
	}
	console.debug(`[Workloads] simulateMatrixMultiplication: multiplication completed in ${Date.now() - multStart}ms`);
	
	// Use result to prevent optimization
	if (result[0][0] < -1) {
		console.log("Matrix multiplication completed");
	}
	
	console.debug(`[Workloads] simulateMatrixMultiplication: completed ${size}x${size} matrix multiplication`);
}

/**
 * String processing operations
 */
function stringProcessing(input: string): void {
	console.debug(`[Workloads] stringProcessing: starting with input length=${input?.length || 0}`);
	
	if (!input) {
		console.debug(`[Workloads] stringProcessing: empty input, returning early`);
		return;
	}
	
	// String manipulation
	const manipStart = Date.now();
	const reversed = input.split('').reverse().join('');
	const upper = input.toUpperCase();
	const lower = input.toLowerCase();

	// Use manipulated strings to mimic load
	let accumulator = reversed + upper + lower;
	console.debug(`[Workloads] stringProcessing: string manipulation completed in ${Date.now() - manipStart}ms`);

	// String analysis
	const analysisStart = Date.now();
	const words = input.split(/\s+/);
	const charCount = input.length;
	const wordCount = words.length;
	accumulator += words.join('-') + charCount + wordCount;
	console.debug(`[Workloads] stringProcessing: string analysis completed, words=${wordCount}, chars=${charCount} in ${Date.now() - analysisStart}ms`);

	// Pattern matching simulation
	const patternStart = Date.now();
	const vowels = input.match(/[aeiouAEIOU]/g)?.length || 0;
	const consonants = input.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g)?.length || 0;
	accumulator += vowels + consonants;
	console.debug(`[Workloads] stringProcessing: pattern matching completed, vowels=${vowels}, consonants=${consonants} in ${Date.now() - patternStart}ms`);

	// String hashing simulation
	const hashStart = Date.now();
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		hash = ((hash << 5) - hash + input.charCodeAt(i)) & 0xffffffff;
	}
	// Use hash variable to mimic load
	accumulator += hash;
	console.debug(`[Workloads] stringProcessing: string hashing completed, hash=${hash} in ${Date.now() - hashStart}ms`);

	// Prevent optimizer from removing unused code (noop)
	if (accumulator.length === -1) {
		console.log(accumulator);
	}
	
	console.debug(`[Workloads] stringProcessing: all string operations completed successfully`);
}

/**
 * Array operations
 */
function arrayOperations(): void {
	console.debug(`[Workloads] arrayOperations: starting array operations`);
	
	// Generate random arrays
	const genStart = Date.now();
	const numbers = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 1000));
	const strings = Array.from({ length: 500 }, (_, i) => `item_${i}_${Math.random()}`);
	console.debug(`[Workloads] arrayOperations: generated arrays in ${Date.now() - genStart}ms`);
	
	// Sorting operations
	const sortStart = Date.now();
	const sortedNumbers = [...numbers].sort((a, b) => a - b);
	const sortedStrings = [...strings].sort();
	console.debug(`[Workloads] arrayOperations: sorting completed in ${Date.now() - sortStart}ms`);
	
	// Searching operations
	const searchStart = Date.now();
	const target = numbers[Math.floor(Math.random() * numbers.length)];
	const binarySearchResult = binarySearch(sortedNumbers, target);
	const linearSearchResult = numbers.indexOf(target);
	console.debug(`[Workloads] arrayOperations: searching completed, target=${target}, binary=${binarySearchResult}, linear=${linearSearchResult} in ${Date.now() - searchStart}ms`);
	
	// Array transformations
	const transformStart = Date.now();
	const doubled = numbers.map(x => x * 2);
	const filtered = numbers.filter(x => x > 500);
	const reduced = numbers.reduce((sum, x) => sum + x, 0);
	console.debug(`[Workloads] arrayOperations: transformations completed, filtered=${filtered.length}, reduced=${reduced} in ${Date.now() - transformStart}ms`);
	
	// Array manipulations
	const manipStart = Date.now();
	numbers.push(...doubled.slice(0, 100));
	numbers.splice(0, 50);
	numbers.unshift(...filtered.slice(0, 25));
	console.debug(`[Workloads] arrayOperations: manipulations completed in ${Date.now() - manipStart}ms`);
	
	// Use computed values to prevent optimization
	if (sortedNumbers.length + sortedStrings.length + binarySearchResult + linearSearchResult + reduced < -1) {
		console.log("Array operations completed");
	}
	
	console.debug(`[Workloads] arrayOperations: all array operations completed successfully`);
}

/**
 * Binary search implementation
 */
function binarySearch(arr: number[], target: number): number {
	console.debug(`[Workloads] binarySearch: starting with array length=${arr.length}, target=${target}`);
	
	let left = 0, right = arr.length - 1;
	let iterations = 0;
	
	while (left <= right) {
		iterations++;
		const mid = Math.floor((left + right) / 2);
		if (arr[mid] === target) {
			console.debug(`[Workloads] binarySearch: found target at index=${mid} after ${iterations} iterations`);
			return mid;
		}
		if (arr[mid] < target) left = mid + 1;
		else right = mid - 1;
	}
	
	console.debug(`[Workloads] binarySearch: target not found after ${iterations} iterations`);
	return -1;
}

/**
 * Storage operations with various data types
 */
async function storageOperations(ctx: DurableObjectState, parsed: any): Promise<void> {
	console.debug(`[Workloads] storageOperations: starting storage operations`);
	
	const timestamp = Date.now();
	
	// Store various data types
	const putStart = Date.now();
	await ctx.storage.put("echoer_processing", parsed);
	await ctx.storage.put("timestamp", timestamp);
	await ctx.storage.put("fibonacci_35", calculateFibonacci(35));
	await ctx.storage.put("random_array", Array.from({ length: 100 }, () => Math.random()));
	console.debug(`[Workloads] storageOperations: put operations completed in ${Date.now() - putStart}ms`);
	
	// Retrieve and process stored data
	const getStart = Date.now();
	const retrieved = await ctx.storage.get("echoer_processing");
	const storedTimestamp = await ctx.storage.get("timestamp");
	console.debug(`[Workloads] storageOperations: get operations completed in ${Date.now() - getStart}ms`);
	
	// Update stored data
	const updateStart = Date.now();
	if (storedTimestamp && typeof storedTimestamp === 'number') {
		await ctx.storage.put("timestamp", storedTimestamp + 1);
		console.debug(`[Workloads] storageOperations: updated timestamp from ${storedTimestamp} to ${storedTimestamp + 1}`);
	}
	console.debug(`[Workloads] storageOperations: update operations completed in ${Date.now() - updateStart}ms`);
	
	// Clean up temporary storage
	const deleteStart = Date.now();
	await ctx.storage.delete("echoer_processing");
	await ctx.storage.delete("random_array");
	console.debug(`[Workloads] storageOperations: delete operations completed in ${Date.now() - deleteStart}ms`);
	
	// Sync to ensure writes are persisted
	const syncStart = Date.now();
	await ctx.storage.sync();
	console.debug(`[Workloads] storageOperations: sync operation completed in ${Date.now() - syncStart}ms`);
	
	console.debug(`[Workloads] storageOperations: all storage operations completed successfully`);
}
