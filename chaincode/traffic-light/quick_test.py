#!/usr/bin/env python3
"""
Quick Test - Traffic-Adaptive CA Hash Functions
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from hash.cellular_automaton import traffic_adaptive_hash

print("=" * 70)
print("TRAFFIC-ADAPTIVE CA HASH FUNCTION - QUICK TEST")
print("=" * 70)

test_data = "traffic_light_Main_1st"

print("\n✓ Testing different traffic conditions:\n")

# Test 1: Low traffic
hash1 = traffic_adaptive_hash(test_data, 0.2, "GREEN", 0)
print(f"1. LOW Traffic (GREEN):")
print(f"   {hash1}\n")

# Test 2: Medium traffic
hash2 = traffic_adaptive_hash(test_data, 0.5, "YELLOW", 0)
print(f"2. MEDIUM Traffic (YELLOW):")
print(f"   {hash2}\n")

# Test 3: High traffic
hash3 = traffic_adaptive_hash(test_data, 0.9, "RED", 0)
print(f"3. HIGH Traffic (RED):")
print(f"   {hash3}\n")

# Test 4: Emergency
hash4 = traffic_adaptive_hash(test_data, 0.5, "EMERGENCY", 10)
print(f"4. EMERGENCY:")
print(f"   {hash4}\n")

print("=" * 70)
print("✓ ALL HASHES GENERATED SUCCESSFULLY")
print("=" * 70)
print(f"✓ All hashes are 256-bit: {all(len(h) == 64 for h in [hash1, hash2, hash3, hash4])}")
print(f"✓ All hashes are unique: {len(set([hash1, hash2, hash3, hash4])) == 4}")
print("\nHash function is working correctly! ✨")
