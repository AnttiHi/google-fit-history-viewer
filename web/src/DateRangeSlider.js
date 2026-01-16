import { useState } from 'react';
import { Range } from 'react-range';

export default function DateRangeSlider({ dateFilter, setDateFilter, minDate, maxDate }) {
    return (
        <div className="p-4" style={{ maxWidth: 600 }}>
            <Range
                step={24 * 60 * 60 * 1000}
                min={minDate}
                max={maxDate}
                values={dateFilter}
                onChange={(values) => {
                    setDateFilter([...values]);
                }}
                renderTrack={({ props, children }) => (
                    <div
                        {...props}
                        ref={props.ref}
                        style={{
                            ...props.style,
                            height: '6px',
                            background: '#ccc',
                            borderRadius: '4px',
                            margin: '40px 0',
                            position: 'relative',
                            left: '30px',
                        }}
                    >
                        {children}
                    </div>
                )}
                renderThumb={({ props }) => (
                    <div
                        {...props}
                        ref={props.ref}
                        style={{
                            ...props.style,
                            height: '20px',
                            width: '20px',
                            backgroundColor: '#3b82f6',
                            borderRadius: '50%',
                            boxShadow: '0 0 2px rgba(0,0,0,0.6)',
                        }}
                    />
                )}
            />
            <div className="mt-2">
                {new Date(dateFilter[0]).toLocaleDateString()} — {new Date(dateFilter[1]).toLocaleDateString()}
            </div>
        </div>
    );
}
