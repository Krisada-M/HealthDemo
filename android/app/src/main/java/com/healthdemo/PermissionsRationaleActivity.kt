package com.healthdemo

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class PermissionsRationaleActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // This activity can show why you need permissions. 
        // For a demo, we can just finish it or show a simple view.
        // The Health Connect SDK requires this to be declared.
        finish()
    }
}
