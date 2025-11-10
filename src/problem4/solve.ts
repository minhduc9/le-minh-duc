/**
 * Implementation A: Mathematical Formula Approach
 *
 * Uses the arithmetic series summation formula: sum = n(n+1)/2
 * This avoids any iteration by computing the result directly.
 *
 * Time Complexity: O(1) - Constant time, only arithmetic operations
 * Space Complexity: O(1) - Constant space, no additional data structures
 *
 * This is the most efficient approach as it performs the calculation
 * in a single mathematical operation regardless of the input size.
 */
function sum_to_n_a(n: number): number {
    if (n <= 0) {
        return 0;
    }

    return n % 2 === 0 ? (n / 2) * (n + 1) : ((n + 1) / 2) * n;
}

/**
 * Implementation B: Imperative/Mutable Approach
 *
 * Creates an array of numbers [1, 2, ..., n] and uses forEach to
 * accumulate the sum by mutating an external variable.
 *
 * Time Complexity: O(n) - Linear time, iterates through n elements
 * Space Complexity: O(n) - Linear space, creates an array of size n
 *
 * IMPERATIVE PROGRAMMING PARADIGM:
 * - Uses mutable state: The `sum` variable is declared and modified
 *   throughout the iteration
 * - Side effects: The forEach callback modifies the external `sum` variable,
 *   causing side effects outside the function's scope
 * - Not referentially transparent: The closure captures and mutates `sum`
 * - Imperative style: Tells the computer HOW to compute (step-by-step mutations)
 *
 * This approach violates functional programming principles because:
 * 1. It mutates state (sum += val)
 * 2. The forEach callback is not a pure function (it has side effects)
 * 3. It's harder to reason about due to mutable state
 */
function sum_to_n_b(n: number): number {
    let sum = 0;
    Array.from({ length: n }, (_, i) => i + 1).forEach((val) => {
        sum += val;
    });

    return sum;
}

/**
 * Implementation C: Functional/Immutable Approach
 *
 * Creates an array of numbers [1, 2, ..., n] and uses reduce to
 * compute the sum without mutating any variables.
 *
 * Time Complexity: O(n) - Linear time, iterates through n elements
 * Space Complexity: O(n) - Linear space, creates an array of size n
 *
 * FUNCTIONAL PROGRAMMING PARADIGM:
 * - Pure function: Given the same input (n), always returns the same output
 * - Immutability: No variables are mutated; `reduce` creates new accumulator
 *   values in each iteration without modifying the original
 * - No side effects: The reduce callback doesn't modify anything outside
 *   its scope; it simply returns a new value
 * - Referentially transparent: Can replace the function call with its result
 *   without changing program behavior
 * - Declarative style: Describes WHAT to compute (the sum), not HOW
 * - Higher-order function: `reduce` is a higher-order function that takes
 *   another function as an argument
 *
 * Functional composition: f(A: number) -> f(B: number)
 * - Input: number (n) -> Transformation: [1,2,...,n] -> Reduction: sum
 * - Each step returns a new value rather than modifying existing state
 *
 * Advantages of this functional approach:
 * 1. Easier to test (no hidden state or side effects)
 * 2. Easier to reason about (predictable, no surprises)
 * 3. Thread-safe (immutability makes it safe for concurrent execution)
 * 4. More maintainable (pure functions are easier to understand and modify)
 * 5. Composable (can easily combine with other functional operations)
 */
function sum_to_n_c(n: number): number {
    if (n <= 0) {
        return 0;
    }

    return Array.from({ length: n }, (_, i) => i + 1).reduce(
        (acc, val) => acc + val,
        0,
    );
}
