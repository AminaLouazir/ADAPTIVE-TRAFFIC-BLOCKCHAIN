"""
Traffic-Adaptive Cellular Automaton Hash Function
Specifically designed for smart traffic light management

Innovation: Rule dynamically adapts based on traffic conditions
- Rule selection based on traffic density
- Neighborhood size varies with signal state
- Evolution steps depend on congestion level
"""

import hashlib
import time
from typing import List, Tuple
from datetime import datetime


class TrafficAdaptiveCA:
    """
    Cellular Automaton that adapts to traffic conditions
    
    Key Innovation:
    - Rule selection based on traffic density and signal state
    - Neighborhood size varies with signal state (RED=wider, GREEN=local)
    - Evolution steps depend on congestion level (more traffic = more steps)
    """
    
    def __init__(self, size: int = 256):
        """
        Initialize Traffic-Adaptive Cellular Automaton
        
        Args:
            size: Number of cells in the automaton (default 256 for 256-bit hash)
        """
        self.size = size
        self.state = [0] * size
        self.rule = 30  # Default, will be adapted
        self.neighborhood_radius = 1  # Will adapt based on traffic
        
    def init_state(self, data: bytes, traffic_density: float = 0.5) -> None:
        """
        Initialize CA state from input data + traffic density
        
        Question 1.1 (Atelier 2): Initialize state with traffic-aware seeding
        
        Args:
            data: Input data bytes
            traffic_density: Traffic density (0.0 = empty, 1.0 = congested)
        """
        # Convert bytes to bits
        bits = []
        for byte in data:
            for i in range(8):
                bits.append((byte >> (7 - i)) & 1)
        
        # Traffic-aware padding: Higher density = more complex pattern
        if len(bits) < self.size:
            # Use traffic density to create unique padding
            density_seed = int(traffic_density * 255)
            pad_generator = hashlib.sha256(data + bytes([density_seed]))
            
            pad_bits = []
            for byte in pad_generator.digest():
                for i in range(8):
                    pad_bits.append((byte >> (7 - i)) & 1)
            
            # Repeat padding to fill state
            needed = self.size - len(bits)
            bits.extend((pad_bits * (needed // len(pad_bits) + 1))[:needed])
        
        self.state = bits[:self.size]
    
    def select_traffic_rule(self, density: float, signal_state: str) -> int:
        """
        Dynamically select CA rule based on traffic conditions
        
        INNOVATION: Traffic-aware rule selection
        
        Rules mapping:
        - LOW density (0.0-0.3) + GREEN → Rule 30 (chaotic, fast flow)
        - MEDIUM density (0.3-0.7) + YELLOW → Rule 90 (balanced, XOR-based)
        - HIGH density (0.7-1.0) + RED → Rule 110 (complex, controlled)
        - Emergency states → Rule 184 (traffic flow model)
        
        Args:
            density: Traffic density (0.0-1.0)
            signal_state: RED, YELLOW, GREEN, or EMERGENCY
        
        Returns:
            CA rule number (0-255)
        """
        # Emergency override
        if signal_state == "EMERGENCY":
            return 184  # Rule 184 simulates traffic flow
        
        # Density-based rule selection
        if density < 0.3:
            # Low traffic - use chaotic rule for randomness
            if signal_state == "GREEN":
                return 30  # Rule 30: chaotic, good mixing
            else:
                return 90  # Rule 90: simple XOR
        
        elif density < 0.7:
            # Medium traffic - balanced complexity
            if signal_state == "YELLOW":
                return 110  # Rule 110: Turing-complete
            else:
                return 90  # Rule 90: deterministic
        
        else:
            # High traffic - controlled evolution
            if signal_state == "RED":
                return 110  # Rule 110: complex but controlled
            else:
                return 184  # Rule 184: traffic flow simulation
    
    def adapt_neighborhood(self, signal_state: str) -> int:
        """
        Adapt neighborhood radius based on signal state
        
        This controls HOW MANY CELLS each cell looks at when evolving.
        NOT about physical location - purely computational complexity.
        
        Mapping:
        - GREEN → r=1 (local interactions, 3 cells total)
        - YELLOW → r=2 (medium range, 5 cells total)
        - RED → r=3 (wide area coordination, 7 cells total)
        - EMERGENCY → r=5 (city-wide propagation, 11 cells total)
        
        Args:
            signal_state: Traffic light color (RED/YELLOW/GREEN/EMERGENCY)
        
        Returns:
            Neighborhood radius (number of cells on each side)
        """
        if signal_state == "GREEN":
            return 1  # Local only
        elif signal_state == "YELLOW":
            return 2  # Medium coordination
        elif signal_state == "RED":
            return 3  # Wide area
        elif signal_state == "EMERGENCY":
            return 5  # Maximum coordination
        else:
            return 1  # Default
    
    def evolve(self, rule: int, radius: int = 1) -> None:
        """
        Apply CA rule with configurable neighborhood radius
        
        Question 1.2 (Atelier 2): Evolution with variable neighborhood
        
        For each cell:
        1. Look at (2*radius + 1) neighbors
        2. Calculate neighborhood configuration
        3. Apply rule to determine new state
        
        Args:
            rule: CA rule number (0-255)
            radius: Neighborhood radius (1, 2, 3, etc.)
        """
        new_state = [0] * self.size
        
        for i in range(self.size):
            # Get extended neighborhood
            neighborhood_bits = []
            for offset in range(-radius, radius + 1):
                idx = (i + offset) % self.size
                neighborhood_bits.append(self.state[idx])
            
            # Calculate neighborhood configuration
            neighborhood_value = 0
            for bit in neighborhood_bits:
                neighborhood_value = (neighborhood_value << 1) | bit
            
            # Apply rule
            if radius == 1:
                # Standard rule application for 3-cell neighborhood
                new_state[i] = (rule >> neighborhood_value) & 1
            else:
                # Extended neighborhood: use hash-based rule
                # Mix rule number with neighborhood value for larger neighborhoods
                extended_rule = (rule ^ (neighborhood_value % 256))
                bit_position = neighborhood_value % 8
                new_state[i] = (extended_rule >> bit_position) & 1
        
        self.state = new_state
    
    def calculate_evolution_steps(self, density: float, urgency: int = 0) -> int:
        """
        Calculate evolution steps based on traffic urgency
        
        More traffic = more evolution steps = more security
        
        Args:
            density: Traffic density (0.0-1.0)
            urgency: Urgency level (0-10, for emergency vehicles)
        
        Returns:
            Number of evolution steps
        """
        base_steps = 64
        
        # Density affects steps: more traffic = more evolution
        density_factor = int(density * 64)
        
        # Urgency adds extra mixing for security
        urgency_factor = urgency * 10
        
        total_steps = base_steps + density_factor + urgency_factor
        
        # Cap at reasonable maximum
        return min(total_steps, 256)
    
    def get_hash(self, steps: int) -> bytes:
        """
        Extract 256-bit hash from CA state
        
        Question 2.3 (Atelier 2): Produce fixed 256-bit hash
        
        Returns:
            32 bytes (256 bits) representing the hash
        """
        # Convert state bits to bytes
        hash_bytes = bytearray(32)  # 256 bits = 32 bytes
        
        for i in range(32):
            byte_val = 0
            for j in range(8):
                bit_idx = i * 8 + j
                if bit_idx < len(self.state):
                    byte_val |= self.state[bit_idx] << (7 - j)
            hash_bytes[i] = byte_val
        
        return bytes(hash_bytes)


def traffic_adaptive_hash(
    input_data: str,
    traffic_density: float = 0.5,
    signal_state: str = "GREEN",
    urgency: int = 0
) -> str:
    """
    Main Traffic-Adaptive CA Hash Function
    
    Question 2.1 (Atelier 2): Implementation of traffic-specific ac_hash
    
    This hash function adapts its behavior based on real traffic conditions:
    - Light traffic (GREEN) → Fast, simple hashing
    - Heavy traffic (RED) → Complex, secure hashing
    - Emergency → Maximum security
    
    Args:
        input_data: Data to hash (block data, transaction, etc.)
        traffic_density: Current traffic density (0.0-1.0)
        signal_state: Current signal state (RED/YELLOW/GREEN/EMERGENCY)
        urgency: Urgency level (0-10, for emergency vehicles)
    
    Returns:
        256-bit hash as hexadecimal string (64 characters)
    
    Example:
        # Low traffic, green light - fast hashing
        hash1 = traffic_adaptive_hash("block_data", 0.2, "GREEN", 0)
        
        # High traffic, red light - secure hashing
        hash2 = traffic_adaptive_hash("block_data", 0.9, "RED", 0)
        
        # Emergency vehicle - maximum security
        hash3 = traffic_adaptive_hash("block_data", 0.5, "EMERGENCY", 10)
    """
    # Question 2.2 (Atelier 2): Convert text to bytes
    data = input_data.encode('utf-8')
    
    # Create CA instance
    ca = TrafficAdaptiveCA(size=256)
    
    # Initialize with traffic-aware seeding
    ca.init_state(data, traffic_density)
    
    # Select rule based on traffic conditions
    rule = ca.select_traffic_rule(traffic_density, signal_state)
    
    # Adapt neighborhood size
    radius = ca.adapt_neighborhood(signal_state)
    
    # Calculate evolution steps
    steps = ca.calculate_evolution_steps(traffic_density, urgency)
    
    # Evolve CA
    for _ in range(steps):
        ca.evolve(rule, radius)
    
    # Extract hash
    hash_bytes = ca.get_hash(steps)
    
    return hash_bytes.hex()


def intersection_hash(
    intersection_id: str,
    timestamp: int,
    signal_states: dict,
    vehicle_counts: dict,
    weather_factor: float = 1.0
) -> str:
    """
    Hash function specifically for traffic intersection state
    
    Combines multiple traffic factors:
    - Intersection ID
    - Timestamp
    - All signal states (north, south, east, west)
    - Vehicle counts per direction
    - Weather conditions
    
    Args:
        intersection_id: Unique intersection identifier
        timestamp: Unix timestamp
        signal_states: Dict of signal states per direction
        vehicle_counts: Dict of vehicle counts per direction
        weather_factor: Weather impact on flow (0.0-1.0, 1.0=clear)
    
    Returns:
        256-bit hash as hex string
    
    Example:
        hash = intersection_hash(
            intersection_id="Main-1st",
            timestamp=1699800000,
            signal_states={"north": "RED", "south": "GREEN", "east": "RED", "west": "GREEN"},
            vehicle_counts={"north": 15, "south": 8, "east": 12, "west": 5},
            weather_factor=0.8  # Rain reduces flow
        )
    """
    # Calculate average density
    total_vehicles = sum(vehicle_counts.values())
    avg_density = min(total_vehicles / 40.0, 1.0)  # Assume max 40 vehicles
    
    # Adjust density for weather
    adjusted_density = min(avg_density * weather_factor, 1.0)
    
    # Determine overall signal state (most restrictive)
    if "RED" in signal_states.values():
        overall_state = "RED"
    elif "YELLOW" in signal_states.values():
        overall_state = "YELLOW"
    else:
        overall_state = "GREEN"
    
    # Construct input data
    input_data = f"{intersection_id}|{timestamp}|{signal_states}|{vehicle_counts}|{weather_factor}"
    
    # Calculate urgency (high vehicle count = high urgency)
    urgency = min(int(total_vehicles / 4), 10)
    
    # Generate hash
    return traffic_adaptive_hash(input_data, adjusted_density, overall_state, urgency)


def block_hash_with_traffic(
    block_index: int,
    previous_hash: str,
    timestamp: int,
    transactions: list,
    nonce: int,
    network_congestion: float = 0.5
) -> str:
    """
    Block hashing adapted for traffic blockchain
    
    Question 3.2 (Atelier 2): Modified mining with ac_hash
    
    Integrates network congestion into hash calculation:
    - Higher congestion → more complex hashing (harder mining)
    - Lower congestion → simpler hashing (faster mining)
    
    This creates adaptive difficulty based on real-time network conditions!
    
    Args:
        block_index: Block number
        previous_hash: Hash of previous block
        timestamp: Block timestamp
        transactions: List of transactions
        nonce: Mining nonce
        network_congestion: Overall network traffic (0.0-1.0)
    
    Returns:
        Block hash as hex string
    """
    # Serialize block data
    tx_data = "|".join([str(tx) for tx in transactions])
    block_data = f"{block_index}|{previous_hash}|{timestamp}|{tx_data}|{nonce}"
    
    # Determine signal state based on congestion
    if network_congestion < 0.3:
        state = "GREEN"
    elif network_congestion < 0.7:
        state = "YELLOW"
    else:
        state = "RED"
    
    # Higher congestion = higher urgency (harder mining)
    urgency = int(network_congestion * 10)
    
    return traffic_adaptive_hash(block_data, network_congestion, state, urgency)


def verify_different_inputs() -> bool:
    """
    Question 2.4 (Atelier 2): Verify that different inputs produce different hashes
    
    Returns:
        True if hashes are different, False otherwise
    """
    input1 = "intersection_Main_1st_signal_GREEN"
    input2 = "intersection_Main_1st_signal_RED"
    
    hash1 = traffic_adaptive_hash(input1, 0.5, "GREEN")
    hash2 = traffic_adaptive_hash(input2, 0.5, "RED")
    
    print(f"Input 1: {input1}")
    print(f"Hash 1:  {hash1}")
    print(f"\nInput 2: {input2}")
    print(f"Hash 2:  {hash2}")
    print(f"\nHashes different: {hash1 != hash2}")
    
    return hash1 != hash2


if __name__ == "__main__":
    # Test the hash function
    print("=" * 70)
    print("Traffic-Adaptive CA Hash Function Test")
    print("=" * 70)
    
    test_data = "block_12345_timestamp_1699800000"
    
    print("\n1. Low Traffic, Green Light:")
    hash1 = traffic_adaptive_hash(test_data, 0.2, "GREEN", 0)
    print(f"   {hash1}")
    
    print("\n2. Medium Traffic, Yellow Light:")
    hash2 = traffic_adaptive_hash(test_data, 0.5, "YELLOW", 0)
    print(f"   {hash2}")
    
    print("\n3. High Traffic, Red Light:")
    hash3 = traffic_adaptive_hash(test_data, 0.9, "RED", 0)
    print(f"   {hash3}")
    
    print("\n4. Emergency Vehicle:")
    hash4 = traffic_adaptive_hash(test_data, 0.5, "EMERGENCY", 10)
    print(f"   {hash4}")
    
    print("\n5. Intersection Hash Example:")
    hash5 = intersection_hash(
        "Main-1st",
        1699800000,
        {"north": "RED", "south": "GREEN"},
        {"north": 15, "south": 8},
        0.9
    )
    print(f"   {hash5}")
    
    print("\n" + "=" * 70)
    print("Verification Test (Question 2.4):")
    print("=" * 70)
    verify_different_inputs()
