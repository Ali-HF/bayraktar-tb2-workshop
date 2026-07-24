# Bayraktar TB2 Workshop — UAV Design Report Handout

This document summarizes the current technical configurations, physical dimensions, component specs, and weight breakdown of the Bayraktar TB2 UAV model, corresponding to the default settings (EPS Foamboard and Custom Electronics) used in the engineering report dashboard.

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

## 2. Electronics Specs (Default Configuration)

| Category / Component | Item Name | Quantity | Unit Weight | Subtotal Weight | Unit Cost (PKR) | Specs |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Motor** | Brushless DC Motor | 1 | 175 g | **175 g** | 400 | 1090 KV, 250W, 22A Max Current, 920g Thrust |
| **ESC** | Electronic Speed Controller | 1 | 63 g | **63 g** | 6,800 | 60A current rating |
| **Battery** | LiPo Battery | 1 | 180 g | **180 g** | 4,990 | 3S, 2200 mAh, 11.1V, 30C discharge |
| **Servos** | 9g micro servos | 4 | 9 g | **36 g** | 9,000 | 2.0 kg·cm torque, 0.08s speed (2 active + 2 spare) |
| **Propeller** | Prop Saver / Prop Adapter | 1 | 12 g | **12 g** | 500 | 9" diameter, 6" pitch |
| **Receiver** | RC Reciever | 1 | 15 g | **15 g** | 5,499 | 6 channels |
| **Transmitter** | RC Transmitter | 1 | 392 g | **0 g** *(Ground)* | 21,500 | 10 channels |
| **BEC** | Battey Eliminator Circuit | 1 | 0 g | **0 g** | 6,000 | 5V regulator |
| **Wiring** | Power Distribution / Wiring | 1 set | 18 g | **18 g** | 210 | Connectors, power wiring, signal cables |
| **Voltage Monitor** | Voltage Monitor / Alarm | 1 | 7 g | **7 g** | 668 | Alarm sounder / monitor |
| **SUBTOTALS** | | | | **506 g** | **82,567** | |

---

## 3. Structural & Misc Weights (in grams)

Structural weights are calculated using the default **EPS Foamboard** material density ($0.03\text{ g/cm}^3$) multiplied by the flat-plate part volume (surface area $\times$ thickness).

| Component | Surface Area ($\text{cm}^2$) | Thickness (mm) | Calculated Volume ($\text{cm}^3$) | Calculated Weight (g) | Material Default | Cost (PKR) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Fuselage** | 600 | 2.0 | 120 | **3.6 g** | EPS Foamboard | 7,500 |
| **Wing** | 800 | 1.5 | 120 | **3.6 g** | EPS Foamboard | 6,000 |
| **V-Tail** | 200 | 1.2 | 24 | **0.7 g** | EPS Foamboard | 3,000 |
| **Motor Mount** | 40 | 4.0 | 16 | **0.5 g** | EPS Foamboard | 1,000 |
| **Hardware / Misc** | — | — | — | **30.0 g** | Glue, screws, tape, control horns | 45,700* |
| **SUBTOTALS** | | | | **38.4 g** | | **63,200** |

*\*Note: Hardware/Misc cost includes the additional workshop build tools, finishing paints, covering films, and backup parts totaling Rs. 45,700.*

### Weight Summary:
*   **Total Structural & Hardware Weight:** 38.4 g
*   **Total Electronics Flying Weight:** 506.0 g
*   **Grand Total Aircraft Flying Weight:** **544.4 g**
*   **Total Build Cost:** **Rs. 145,767**
