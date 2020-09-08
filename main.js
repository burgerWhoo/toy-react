import { createElement, Component, render } from "./toy-react.js"

class MyComponent extends Component {
    render() {
        return <div>
            <h1>my Component</h1>
            {this.children}
        </div>
    }
}

render(<MyComponent id="a" class="c" >
    <div>abc</div>
    <div><p>def</p></div>
    <div><h2>mmm</h2></div>
</MyComponent>, document.body);