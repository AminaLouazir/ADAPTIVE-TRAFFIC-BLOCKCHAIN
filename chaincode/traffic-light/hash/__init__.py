"""
Traffic-Adaptive Cellular Automaton Hash Module

This module implements innovative hash functions that adapt to traffic conditions.
Standalone hash function library - no chaincode dependencies.
"""

from .cellular_automaton import (
    TrafficAdaptiveCA,
    traffic_adaptive_hash,
    intersection_hash,
    block_hash_with_traffic,
    verify_different_inputs
)

from .hash_analysis import (
    benchmark_hash,
    avalanche_test,
    bit_distribution_test,
    compare_rules,
    mining_simulation,
    generate_full_report
)

__all__ = [
    'TrafficAdaptiveCA',
    'traffic_adaptive_hash',
    'intersection_hash',
    'block_hash_with_traffic',
    'verify_different_inputs',
    'benchmark_hash',
    'avalanche_test',
    'bit_distribution_test',
    'compare_rules',
    'mining_simulation',
    'generate_full_report'
]

__version__ = '1.0.0'

