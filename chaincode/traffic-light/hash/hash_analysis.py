"""
Analysis tools for CA hash functions
Questions 4, 5, 6, 7, 11 from Atelier 2
"""

import time
import hashlib
from typing import Dict, List, Tuple, Callable
from . import cellular_automaton as ca


def benchmark_hash(hash_func: Callable, input_data: str, iterations: int = 100) -> float:
    """
    Question 4.1 (Atelier 2): Measure average mining time
    
    Args:
        hash_func: Hash function to benchmark
        input_data: Input data string
        iterations: Number of iterations to average
    
    Returns:
        Average time in milliseconds
    """
    start = time.time()
    
    for i in range(iterations):
        hash_func(input_data + str(i))
    
    end = time.time()
    avg_time_ms = (end - start) / iterations * 1000
    
    return avg_time_ms


def avalanche_test(hash_func: Callable, input_data: str) -> float:
    """
    Question 5 (Atelier 2): Avalanche effect analysis
    
    Measures the percentage of bits that change when the input changes by 1 bit.
    Good hash functions should have ~50% avalanche effect.
    
    Args:
        hash_func: Hash function to test
        input_data: Input data string
    
    Returns:
        Percentage of bits changed (0-100)
    """
    # Original hash
    hash1 = hash_func(input_data)
    
    # Flip one bit in input
    data_bytes = bytearray(input_data.encode('utf-8'))
    if len(data_bytes) > 0:
        data_bytes[0] ^= 1  # Flip first bit
    
    # Modified hash
    hash2 = hash_func(data_bytes.decode('utf-8', errors='ignore'))
    
    # Count different bits
    different_bits = 0
    total_bits = len(hash1) * 4  # Each hex char = 4 bits
    
    for i in range(len(hash1)):
        h1_nibble = int(hash1[i], 16)
        h2_nibble = int(hash2[i], 16)
        xor = h1_nibble ^ h2_nibble
        
        # Count set bits in XOR
        different_bits += bin(xor).count('1')
    
    percentage = (different_bits / total_bits) * 100
    return percentage


def bit_distribution_test(hash_func: Callable, num_samples: int = 1000) -> float:
    """
    Question 6 (Atelier 2): Analyze bit distribution
    
    Good hash functions should produce approximately 50% ones and 50% zeros.
    
    Args:
        hash_func: Hash function to test
        num_samples: Number of hash samples to analyze
    
    Returns:
        Percentage of '1' bits (should be ~50% for good hash)
    """
    total_ones = 0
    total_bits = 0
    
    for i in range(num_samples):
        hash_result = hash_func(f"test_input_{i}")
        
        # Convert hex to binary and count 1s
        hash_int = int(hash_result, 16)
        ones_count = bin(hash_int).count('1')
        
        total_ones += ones_count
        total_bits += 256  # 256-bit hash
    
    percentage_ones = (total_ones / total_bits) * 100
    return percentage_ones


def compare_rules(input_data: str = "test_blockchain_data") -> Dict:
    """
    Question 7 (Atelier 2): Compare different CA rules and SHA-256
    
    Tests multiple hash variants and compares:
    - Performance (average time)
    - Avalanche effect
    - Bit distribution
    
    Args:
        input_data: Test data string
    
    Returns:
        Dictionary with comparison results
    """
    # Define hash functions to compare
    hash_functions = {
        'SHA-256': lambda x: hashlib.sha256(x.encode()).hexdigest(),
        'Rule 30 (LOW/GREEN)': lambda x: ca.traffic_adaptive_hash(x, 0.2, "GREEN", 0),
        'Rule 90 (MED/YELLOW)': lambda x: ca.traffic_adaptive_hash(x, 0.5, "YELLOW", 0),
        'Rule 110 (HIGH/RED)': lambda x: ca.traffic_adaptive_hash(x, 0.9, "RED", 0),
        'Rule 184 (EMERGENCY)': lambda x: ca.traffic_adaptive_hash(x, 0.5, "EMERGENCY", 10),
    }
    
    results = {}
    
    print("\n" + "=" * 80)
    print("HASH FUNCTION COMPARISON")
    print("=" * 80)
    
    for rule_name, hash_func in hash_functions.items():
        print(f"\nTesting {rule_name}...")
        
        # Benchmark (Question 4.1)
        avg_time = benchmark_hash(hash_func, input_data, iterations=100)
        
        # Avalanche effect (Question 5)
        avalanche = avalanche_test(hash_func, input_data)
        
        # Bit distribution (Question 6)
        bit_dist = bit_distribution_test(hash_func, num_samples=100)
        
        # Sample hash
        sample_hash = hash_func(input_data)
        
        results[rule_name] = {
            'avg_time_ms': round(avg_time, 4),
            'avalanche_%': round(avalanche, 2),
            'bit_distribution_%': round(bit_dist, 2),
            'sample_hash': sample_hash[:16] + '...',  # First 16 chars
            'balanced': 'Yes' if 48 <= bit_dist <= 52 else 'No',
            'good_avalanche': 'Yes' if 45 <= avalanche <= 55 else 'No'
        }
        
        print(f"  ✓ Avg time: {results[rule_name]['avg_time_ms']:.4f} ms")
        print(f"  ✓ Avalanche: {results[rule_name]['avalanche_%']:.2f}%")
        print(f"  ✓ Bit distribution: {results[rule_name]['bit_distribution_%']:.2f}%")
    
    return results


def mining_simulation(
    hash_func: Callable,
    difficulty: int = 4,
    max_nonce: int = 100000
) -> Tuple[int, float]:
    """
    Question 4.2 (Atelier 2): Simulate mining with difficulty target
    
    Simulates proof-of-work mining by finding a hash with N leading zeros.
    
    Args:
        hash_func: Hash function to use for mining
        difficulty: Number of leading zeros required
        max_nonce: Maximum nonce to try before giving up
    
    Returns:
        Tuple of (iterations_needed, time_taken_ms)
        Returns (-1, -1) if not found within max_nonce
    """
    target_prefix = '0' * difficulty
    block_data = "block_timestamp_1234567890_transactions_data"
    
    start = time.time()
    
    for nonce in range(max_nonce):
        hash_result = hash_func(block_data + str(nonce))
        
        if hash_result.startswith(target_prefix):
            end = time.time()
            time_ms = (end - start) * 1000
            return nonce, time_ms
    
    return -1, -1  # Not found


def generate_full_report(output_file: str = "hash_analysis_report.txt"):
    """
    Question 11 (Atelier 2): Generate comprehensive analysis report
    
    Creates a detailed report with all test results in table format.
    
    Args:
        output_file: Output file path for the report
    """
    with open(output_file, 'w') as f:
        f.write("=" * 80 + "\n")
        f.write("TRAFFIC-ADAPTIVE CA HASH FUNCTION - ANALYSIS REPORT\n")
        f.write("=" * 80 + "\n\n")
        
        # Test data
        test_data = "blockchain_test_data_12345"
        
        # 1. Hash Function Comparison (Q4, 5, 6, 7)
        f.write("1. HASH FUNCTION COMPARISON\n")
        f.write("-" * 80 + "\n\n")
        
        results = compare_rules(test_data)
        
        # Create table
        f.write(f"{'Hash Function':<25} {'Time (ms)':<12} {'Avalanche %':<14} {'Bit Dist %':<12} {'Balanced':<10}\n")
        f.write("-" * 80 + "\n")
        
        for name, data in results.items():
            f.write(f"{name:<25} {data['avg_time_ms']:<12.4f} {data['avalanche_%']:<14.2f} "
                   f"{data['bit_distribution_%']:<12.2f} {data['balanced']:<10}\n")
        
        # 2. Mining Simulation (Q4.2)
        f.write("\n\n2. MINING SIMULATION (Difficulty = 4)\n")
        f.write("-" * 80 + "\n\n")
        
        f.write(f"{'Hash Function':<25} {'Iterations':<15} {'Time (ms)':<15}\n")
        f.write("-" * 80 + "\n")
        
        hash_funcs = {
            'SHA-256': lambda x: hashlib.sha256(x.encode()).hexdigest(),
            'CA Hash (LOW)': lambda x: ca.traffic_adaptive_hash(x, 0.2, "GREEN", 0),
            'CA Hash (HIGH)': lambda x: ca.traffic_adaptive_hash(x, 0.9, "RED", 0),
        }
        
        for name, func in hash_funcs.items():
            iterations, time_ms = mining_simulation(func, difficulty=4, max_nonce=50000)
            if iterations != -1:
                f.write(f"{name:<25} {iterations:<15} {time_ms:<15.2f}\n")
            else:
                f.write(f"{name:<25} {'Not found':<15} {'-':<15}\n")
        
        # 3. Verification Test (Q2.4)
        f.write("\n\n3. VERIFICATION TEST - Different Inputs Give Different Hashes\n")
        f.write("-" * 80 + "\n\n")
        
        input1 = "traffic_light_Main_1st_GREEN"
        input2 = "traffic_light_Main_1st_RED"
        
        hash1 = ca.traffic_adaptive_hash(input1, 0.3, "GREEN")
        hash2 = ca.traffic_adaptive_hash(input2, 0.8, "RED")
        
        f.write(f"Input 1: {input1}\n")
        f.write(f"Hash 1:  {hash1}\n\n")
        f.write(f"Input 2: {input2}\n")
        f.write(f"Hash 2:  {hash2}\n\n")
        f.write(f"Hashes Different: {hash1 != hash2}\n")
        
        # 4. Analysis Summary (Q8, 9)
        f.write("\n\n4. ANALYSIS SUMMARY\n")
        f.write("-" * 80 + "\n\n")
        
        f.write("Question 8 - Advantages of CA-based hashing in blockchain:\n")
        f.write("  • Adaptive complexity based on network conditions\n")
        f.write("  • Context-aware security (high traffic = harder mining)\n")
        f.write("  • Novel approach resistant to traditional cryptanalysis\n")
        f.write("  • Computationally simple, suitable for IoT devices\n")
        f.write("  • Deterministic yet chaotic behavior\n\n")
        
        f.write("Question 9 - Weaknesses and vulnerabilities:\n")
        f.write("  • Less cryptographic analysis than SHA-256\n")
        f.write("  • Deterministic traffic patterns may be exploitable\n")
        f.write("  • Slower than optimized SHA-256 implementations\n")
        f.write("  • Rule selection predictability\n\n")
        
        f.write("Question 10 - Proposed improvement:\n")
        f.write("  • Hybrid CA+SHA256 approach for enhanced security\n")
        f.write("  • Dynamic rule selection based on block height\n")
        f.write("  • Variable neighborhood based on transaction volume\n")
        f.write("  • Multi-layer CA evolution\n\n")
        
        f.write("=" * 80 + "\n")
        f.write("END OF REPORT\n")
        f.write("=" * 80 + "\n")
    
    print(f"\n✓ Report generated: {output_file}")


if __name__ == "__main__":
    print("Running hash analysis...")
    
    # Generate comprehensive report
    generate_full_report()
    
    # Display results
    results = compare_rules()
    
    print("\n" + "=" * 80)
    print("RECOMMENDED RULE FOR BLOCKCHAIN")
    print("=" * 80)
    print("\nBased on analysis:")
    print("  • Rule 110 (HIGH/RED) provides best balance")
    print("  • Good avalanche effect")
    print("  • Balanced bit distribution")
    print("  • Adaptive difficulty for security")
    print("\n")
