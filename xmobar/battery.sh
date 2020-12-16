#!/bin/bash

acpi | awk -F"[, \t]*" '{print $3,$4}'
