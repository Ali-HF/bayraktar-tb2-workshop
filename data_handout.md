# Bayraktar TB2 Workshop — UAV Design Report Handout

This document summarizes the current technical configurations, physical dimensions, component specs, and weight breakdown of the Bayraktar TB2 UAV model, corresponding to the new presentation budget allocation (EPS Foamboard and revised Custom Electronics) used in the engineering report dashboard.

---

## 1. Aircraft Dimensions (in mm)

| Dimension Parameter | Value (mm) | Description |
| :--- | :---: | :--- |
| **Wingspan** | 1,000 | Tip-to-tip span of the main wing |
| **Wing Root Chord** | 60 | Longitudinal length of the wing at the root (fuselage join) |
| **Wing Tip Chord** | 40 | Longitudinal length of the wing at the tip |
| **Fuselage Length** | 542 | Total length of the main fuselage pod |
| **V-Tail Root Chord** | 45 | Chord length of the V-tail stabilizers at their root |
| **Distance from Nose to Wing LE** | 220 | Fuselage station of the Wing's Leading Edge (LE) from the nose tip |
| **Distance from Wing TE to Tail LE** | 180 | Gap from the Wing's Trailing Edge (TE) to the V-Tail's Leading Edge (LE) |
| **Wing Sweep Distance** | 15 | Aft sweep offset of the wing leading edge at the wingtips |

---

## 2. Electronics & Propulsion Specs (Default Configuration)

| Category / Component | Item Name | Quantity | Unit Weight | Subtotal Weight | Unit Cost (PKR) | Specs |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Motor** | Brushless DC Motor | 1 | 55 g | **55 g** | 14,828 | 1000 KV, 250W, 22A Max Current, 850g Thrust |
| **ESC** | Electronic Speed Controller | 1 | 30 g | **30 g** | 12,500 | 60A current rating |
| **Battery** | LiPo Battery | 1 | 180 g | **180 g** | 4,800 | 3S, 2200 mAh, 11.1V, 30C discharge |
| **Servos** | 9g micro servos | 4 | 9 g | **36 g** | 900 | 2.0 kg·cm torque, 0.08s speed (2 active + 2 spare) |
| **Propeller** | XOAR Propeller / Adapter | 1 | 0 g | **0 g** | 4,800 | XOAR 10" diameter, 5" pitch |
| **Receiver** | RC Receiver | 1 | 10 g | **10 g** | 11,500 | 6 channels |
| **Transmitter** | RC Transmitter | 1 | 392 g | **0 g** *(Ground)* | 12,500 | 10 channels |
| **BEC** | Battey Eliminator Circuit | 1 | 0 g | **0 g** | 6,000 | 5V regulator |
| **Wiring** | Power Distribution / Wiring | 1 set | 0 g | **0 g** | 1,000 | Connectors, power wiring, signal cables |
| **Voltage Monitor** | Voltage Monitor / Alarm | 1 | 0 g | **0 g** | 600 | Alarm sounder / monitor |
| **SUBTOTALS** | | | | **311 g** | **72,128** | |

---

## 3. Structural & Allocated Budget Summary (in PKR)

The budget is consolidated into high-level allocated categories as shown in the presentation deck. Structural weights are calculated based on **EPS Foamboard** density ($0.03\text{ g/cm}^3$).

### Consolidated Allocation Table

| System Category | Cost (PKR) | Component Breakdown |
| :--- | :---: | :--- |
| **Structure & Hardware** | **21,600** | EPS material (Rs. 17,500) + adhesives, film, paint, tools (Rs. 4,100) |
| **Propulsion** | **32,128** | Motor (Rs. 14,828) + ESC (Rs. 12,500) + Propeller (Rs. 4,800) |
| **Electronics** | **40,000** | Battery (Rs. 4,800) + Servos (Rs. 3,600) + TX/RX, BEC, Wiring, Alarm (Rs. 31,600) |
| **Miscellaneous** | **8,382** | Logistics & Transport (Rs. 4,000) + Competition Entry Fees (Rs. 4,382) |
| **SUBTOTAL** | **102,110** | Sum of all system category costs |
| **Contingency (12%)** | **12,253** | Allocated 12% safety margin |
| **ESTIMATED TOTAL** | **114,363** | Grand total project cost |

---

## 4. Physical Weights Breakdown (in grams)

| Component | Component Type | Physical Material | Weight (g) |
| :--- | :--- | :--- | :---: |
| **Fuselage** | Structure | EPS Foamboard | **150.0 g** |
| **Wing** | Structure | EPS Foamboard | **150.0 g** |
| **V-Tail** | Structure | EPS Foamboard | **40.0 g** |
| **Motor Mount** | Structure | EPS Foamboard | **10.0 g** |
| **Hardware / Misc** | Structure Accessories | Adhesives, screws, tape, control horns, spar, landing gear | **115.0 g** |
| **Electronics** | Internal Propulsion & Radio | Motor, battery, ESC, receiver, servos | **311.0 g** |
| **GRAND TOTAL** | **Aircraft Flying Weight** | | **776.0 g** |
